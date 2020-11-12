const express = require('express')
const router = express.Router()
const debug = require('debug')('nn:api:magento-webhooks')
debug.log = console.log.bind(console)
const calculateStripeCommissionAmountOnRefund = require(__appsDir + '/stripe/calculateStripeCommissionAmountOnRefund')
const stripeRefundJournal = require(__appsDir + '/QBO/QBOStripeRefundJournal.js')


router.post('*', (req, res, next) => {
    if(req.query.token !== process.env.STRIPE_SIMPLE_TOKEN) return res.status(403).send()
    next()
})

router.post('/charge-succeeded', function (req, res, next) {

    if(req.query.token !== process.env.STRIPE_SIMPLE_TOKEN) return res.status(403).send();

    // get sales order number
    var salesOrderNumber = D.get(req, 'body.data.object.description');

    if(!salesOrderNumber) {
        let error = new Error('unable to parse sales order number.')
        error.status = 400
        throw error
    } else {
        salesOrderNumber = salesOrderNumber.split(',')[0].trim();
        salesOrderNumber = salesOrderNumber.replace('#', '');
    }

    if(D.get(req, 'body.livemode') === 'false') {
        console.log(req.body);
        return res.send({ success: true });
    }

    // save the data
    return DB.StripeEvent.create({
        data: req.body,
        eventType: 'charge-succeeded',
        salesOrderNumber: salesOrderNumber,
        eventId: req.body.id
    })
    .then(function (transaction) {
        // send success
        return res.send({
            success: true
        });
    })
    .catch(function (err) { API_ERROR_HANDLER(error, req, res, next) });

});

router.post('/refunded', function (req, res, next) {

    // get sales order number
    var salesOrderNumber = D.get(req, 'body.data.object.description');

    if(!salesOrderNumber) {
        let error = new Error('unable to parse sales order number.')
        error.status = 400
        throw error
    } else {
        salesOrderNumber = salesOrderNumber.split(',')[0].trim();
        salesOrderNumber = salesOrderNumber.replace('#', '');
    }

    var _TRANSACTION;

    return DB.Transaction.findOne({
        where: { salesOrderNumber: salesOrderNumber }
    })
    .then(function (transaction) {

        if (!transaction) throw new Error('Transaction not found for refund!')

        _TRANSACTION = transaction;

        return DB.StripeEvent.create({
            data: req.body,
            eventType: 'refunded',
            salesOrderNumber: salesOrderNumber,
            eventId: req.body.id,
            notLive: (D.get(req, 'body.livemode') === 'false') ? false : null
        })
    }).then((stripeEvent) => {

        let stripeCommissionReturned = calculateStripeCommissionAmountOnRefund(req.body);

        if(D.get(req, 'body.livemode') === 'false') {
            console.log(req.body);
            console.log(_TRANSACTION)
            console.log('returning: ' + stripeCommissionReturned)
            console.log(stripeEvent)
            return res.send({ success: true });
        }

        let amount = D.get(req.body, 'data.object.amount_refunded')/100
        let tax = Math.round(D.get(req.body, 'data.object.amount_refunded')*(parseInt(process.env.GST)/100))/100

        // create a journal entry to reduce stripe commission

        


        return QBO.createJournalEntryAsync(
            stripeRefundJournal(
                _TRANSACTION,
                amount,
                tax,
                stripeCommissionReturned
            )
        )

    }).then(function(journalEntry) {

        if (!journalEntry || D.get(journalEntry, 'Fault')) {
            let error = new Error('QBO error in creating refund journal entry. See QBO Response.')
            error.QBOResponse = journalEntry
            throw error
        }

        _TRANSACTION.qboRefundJournalId = D.get(journalEntry, "Id");

        return _TRANSACTION.save()
    })
    .then(function(transaction) {

        // send success
        return res.send({
            success: true
        })

    })
    .catch(function (error) { API_ERROR_HANDLER(error, req, res, next) });

});

router.post('/payout-paid', function (req, res, next) {

    if(D.get(req, 'body.livemode') === 'false') {
        console.log(req.body);
        return res.send({ success: true });
    }

    // save the data
    var _PAYOUTPAID;
    return DB.PayoutPaid.create({
        data: req.body,
        status: 'pending',
        eventId: req.body.id
    })
    .then(function (payoutPaid) {

       _PAYOUTPAID = payoutPaid;

        var Entry = require(__appsDir + '/QBO/QBOJournalPayoutPaid')
        var entry = Entry(payoutPaid.data)

        return QBO.createJournalEntryAsync(entry);

    })
    .then(function(response) {

        if (D.get(response, 'Fault')) {
            let error = new Error('QBO create payoutpaid journal error. See QBO Response.')
            error.QBOResponse = response
            throw error
        }

        _PAYOUTPAID.status = 'completed';
        return _PAYOUTPAID.save();

    })
    .then(function() {
        // send success
        return res.send({
            success: true
        });
    })
    .catch(function (error) {
        // log the error
        console.log("CRITICAL: Failed to capture stripe payoutpaid with error: " + error);
        if (_PAYOUTPAID) {
            _PAYOUTPAID.status = 'failed';
            _PAYOUTPAID.save().catch(function(err) { console.log("CRITICAL: Failed to set payout to `failed`"); });
        }

        API_ERROR_HANDLER(error, req, res, next)

    })

});


module.exports = router;
