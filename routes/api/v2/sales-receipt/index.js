const express = require('express');
const router = express.Router();
const debug = require('debug')

router.get('/pending-sales-receipt/all', function(req, res) {

    let options = {
        where: {},
        order: [ ['TransactionID', 'DESC'] ],
        include: [{
            model: DB.Inventory_Storage,
            through: {
                model: DB.SoldInventory,
                attributes: [
                    'SoldInventoryID',
                    'Transaction_transactionID',
                    'Inventory_inventoryID',
                    'StorageLocation_storageLocationID',
                    'quantity'
                ]
            },
            include: [{
                model: DB.StorageLocation,
                attributes: [
                    'StorageLocationID',
                    'name'
                ]
            }, {
                model: DB.Inventory,
                attributes: [
                    'InventoryID',
                    'name',
                    'cogs',
                    'sku'
                ]
            }]
        }]
    }

    if (req.query.filter === "all") {
        delete options.limit;
    } else {
        options.where.status = 'pending';
    }

    DB.Transaction.findAll(options).then(function(transactions) {

        res.send({
            success: true,
            data: transactions
        })

    }).catch(err => { API_ERROR_HANDLER(err, req, res, next) })

})

// NICKNACK POST ROUTES
router.post('/create-sales-receipt', (req, res, next) => {

    let _debug = debug('api:create-sales-receipt')

    _debug(req.body)

    // declare the credit card charges.
    const stripeChargesAMEX = process.env.STRIPE_CHARGES_AMEX;
    const stripeChargesMasterOrVisa = process.env.STRIPE_CHARGES_AMEX_MASTER_VISA;

    // check if the transactionID is valid
    if ([undefined, null, false].indexOf(req.body.TransactionID) > -1 || isNaN(parseInt(req.body.TransactionID))) {
        return res.status(400).send({ success: false, message: '`TransactionID` is missing or invalid.'})
    }

    // check that COGS is a valid number
    const checkValidCurrencyFormat = require(__appsDir + '/checkValidCurrencyFormat')
    let _COGS = checkValidCurrencyFormat(req.body.COGS)

    if (!_COGS) return res.status(400).send({ success: false, message: '`COGS` is missing or invalid.'})

    var _TRANSACTION, _CUSTOMER, _SALESRECEIPT;
    var _CREATED_SALES_RECEIPT, _CREATED_EXPENSE, _CREATED_JOURNAL;

    // 1. Find the transaction record on DB
    DB.Transaction.findById(req.body.TransactionID).then(function(transaction) {

        if (!transaction) {
            return API_ERROR_HANDLER(null, req, res, next, {
                message: 'Unable to find transaction using `TransactionID` provided.',
                attachTimeStampToResponse: true,
                level: 'medium'
            })
        }

        _TRANSACTION = transaction

        // if somehow there is not customerEmail, which is our minimum requirement,
        // we will fail the server
        if (!transaction.details.customerEmail) {

            // SEND EMAIL !!!
            let error = new Error('There is no email given in the transaction.')
            error.level = 'high'
            return API_ERROR_HANDLER(error, req, res, next)
        }

        // if all is good, proceed to QBO processes
        // search for existing customer by email (QBO quirks)
        return QBO.findCustomersAsync([{
            field: 'PrimaryEmailAddr', value: transaction.details.customerEmail
        }])

    }).then(function(qboCustomer) {

        var promise;

        // if valid, `customer` is an array
        let customer = D.get(qboCustomer, 'QueryResponse.Customer')

        if (customer) {

            // if there is an existing customer, update the details

            customer = customer[0]

            // we save customer id and name into private global
            // because QuickBooks may error the updating of customer
            // which is not critical to creation of sales receipt
            // so we need the id and name to continue
            _CUSTOMER = {
                Id: customer.Id,
                DisplayName: customer.DisplayName
            }

            // get and increment the sync token
            let syncToken = D.get(customer, 'SyncToken')

            // set all the updates
            let sparseUpdates = {
                Id: customer.Id,
                SyncToken: syncToken,
                Active: true,
                sparse: true
            }

            if (_TRANSACTION.details.address) D.set(sparseUpdates, 'BillAddr.Line1', _TRANSACTION.details.address)
            if (_TRANSACTION.details.addressZip) D.set(sparseUpdates, 'BillAddr.PostalCode', _TRANSACTION.details.addressZip)
            if (_TRANSACTION.details.addressCountry) D.set(sparseUpdates, 'BillAddr.Country', _TRANSACTION.details.addressCountry)

            // do the update
            promise = QBO.updateCustomerAsync(sparseUpdates)

        } else {

            // if there is no existing customer, create a new one.
            let newCustomer = {}

            // the minimum
            D.set(newCustomer, 'PrimaryEmailAddr.Address', _TRANSACTION.details.customerEmail)
            D.set(newCustomer, 'DisplayName', _TRANSACTION.details.customerName)

            // other information

            // address
            if (_TRANSACTION.details.address) D.set(newCustomer, 'BillAddr.Line1', _TRANSACTION.details.address)
            if (_TRANSACTION.details.addressZip) D.set(newCustomer, 'BillAddr.PostalCode', _TRANSACTION.details.addressZip)
            if (_TRANSACTION.details.addressCountry) D.set(newCustomer, 'BillAddr.Country', _TRANSACTION.details.addressCountry)

            // create the customer
            promise = QBO.createCustomerAsync(newCustomer)
        }

        return promise

    }).then(function(customer) {

        // sometimes updating customer causes error
        if (D.get(customer, 'Fault')) {

            // if there are more than one error, throw
            let errors = customer.Fault.Error;

            if (errors.length === 1 && D.get(errors[0], 'code') === "5010") {

                // we don't need this to fail, so just log.
                console.log('Note: ' + errors[0].Message + ' for updating customer ' + _CUSTOMER.Id + ' ' + _CUSTOMER.DisplayName);

            } else {

                let error = new Error('QBO error. See `QBOResponse` for more information.')
                error.QBOResponse = customer
                throw error

            }
        }

        // no errors are thrown, proceed.
        _CUSTOMER = {
            Id: customer.Id,
            DisplayName: customer.DisplayName
        }

        let promises = []

        /* SALES RECEIPT */

        // once customer is created/updated, create the sales receipt
        let salesReceipt = require(__appsDir + '/QBO/QBOSalesReceipt')(_TRANSACTION, _CUSTOMER)

        // create single product line
        // to upgrade this portion when magento can send meta data
        let lines = require(__appsDir + '/QBO/QBOSalesReceiptLine')(_TRANSACTION)

        salesReceipt.Line = lines

        // comments
        if (req.body.comments) salesReceipt.PrivateNote = req.body.comments;

        _debug(salesReceipt)

        let createSalesReceipt = QBO.createSalesReceiptAsync(salesReceipt)
        promises.push(createSalesReceipt)


        /* STRIPE COMMISSION / EXPENSE */

        // if paymentMethod is stripe, create expense - expense is called `purchase` by QuickBooks
        if (_TRANSACTION.paymentMethod.toLowerCase() === 'stripe') {

            let expense = require(__appsDir + '/QBO/QBOPurchase')(_TRANSACTION.details)
            _debug(expense)

            let createExpense = QBO.createPurchaseAsync(expense);
            promises.push(createExpense);

        } else {

            // promise array gap filler
            promises.push(false)
        }



        /* JOURNAL ENTRY FOR COGS */

        if (_COGS === 0) {

            // promise array gap filler
            promises.push(false);

        } else {

            // create journal entry
            let journal = require(__appsDir + '/QBO/QBOJournalCOGS')(_TRANSACTION.details, _COGS)
            let createJournalCOGS = QBO.createJournalEntryAsync(journal);
            promises.push(createJournalCOGS);

        }
        return promises;

    }).spread(function(salesReceipt, expense, journalEntry) {

        _CREATED_SALES_RECEIPT = salesReceipt;
        _CREATED_EXPENSE = expense;
        _CREATED_JOURNAL = journalEntry;

        var QBOerrors = []

        // pushing errors
        var elements = [ salesReceipt, expense, journalEntry];
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (D.get(element, 'Fault')) QBOerrors.push(element);
        }

        if (QBOerrors.length > 0) {

            let error = new Error('QBO error. See `QBOResponse` for more information.')
            error.QBOResponse = QBOerrors
            throw error

        }

        //then finally update the entry as completed.
        _TRANSACTION.status = 'completed';
        if (_CREATED_SALES_RECEIPT && D.get(_CREATED_SALES_RECEIPT, "Id")) _TRANSACTION.qboSalesReceiptId = D.get(_CREATED_SALES_RECEIPT, "Id");
        if (_CREATED_EXPENSE && D.get(_CREATED_EXPENSE, "Id")) _TRANSACTION.qboStripeExpenseId = D.get(_CREATED_EXPENSE, "Id");
        if (_CREATED_EXPENSE && D.get(_CREATED_JOURNAL, "Id")) _TRANSACTION.qboCOGSJournalId = D.get(_CREATED_JOURNAL, "Id");

        return _TRANSACTION.save().catch(function(err) {

            console.log('CRITICAL: Transaction for sales order ' + _TRANSACTION.salesOrderNumber + ' cannot be saved as completed. Reversing all entries.');

            // don't gobble up the error.
            throw err

        });

    })
    .then(transaction => {
        res.send({ success: true });
    })
    .catch(function (err) {

        // if anything goes wrong, attempt to delete all the documents
        require(__appsDir + '/QBO/deleteAllEntriesIfSomeErrorsOccur')(_CREATED_SALES_RECEIPT, _CREATED_EXPENSE, _CREATED_JOURNAL)

        API_ERROR_HANDLER(err, req, res, next)

    });

});


module.exports = router;
