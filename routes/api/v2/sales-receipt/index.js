const express = require('express')
const router = express.Router()
const permit = require(__appsDir + '/passport/permit')('/api/v2/sales-receipt')
const debug = require('debug')('nn:api:sales-receipt')
const completeAsanaTask = require(__appsDir + '/asanaBot/completeTask.js')
debug.log = console.log.bind(console)

router.get('/pending/all', permit('/pending/all', 1), (req, res, next) => {

    let options = {
        where: {
            status: 'pending'
        },
        order: [ ['TransactionID', 'DESC'], [ DB.Inventory_Storage, DB.SoldInventory, 'SoldInventoryID', 'ASC' ] ],
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

    DB.Transaction.findAll(options).then(function(transactions) {

        res.send({
            success: true,
            data: transactions
        })

    }).catch(err => { API_ERROR_HANDLER(err, req, res, next) })

})

router.get('/pending-delivery/all', permit('/pending-delivery/all', 1), (req, res, next) => {

    let options = {
        where: {
            status: 'completed',
            $or: [
                { eventType: 'checkout'},
                { eventType: 'charge-succeeded'}
            ]
        },
        order: [ ['TransactionID', 'DESC'], [ DB.Inventory_Storage, DB.SoldInventory, 'SoldInventoryID', 'ASC' ] ],
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

    DB.Transaction.findAll(options).then(function(transactions) {

        res.send({
            success: true,
            data: transactions
        })

    }).catch(err => { API_ERROR_HANDLER(err, req, res, next) })

})

router.post('/create-sales-receipt', permit('/create-sales-receipt', 8), (req, res, next) => {

    debug(req.body)

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
            let error = new Error('Unable to find transaction using `TransactionID` provided.')
            error.status = 400
            error.level = 'medium'
            throw error
        }

        if (transaction.status !== 'pending') {
            let error = new Error('Sales receipt for transaction has been created.')
            error.status = 400
            error.level = 'low'
            error.noLogging = true
            throw error
        }

        debug('Transaction found in database.')

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

        debug('Completed the search for existing customer in QBO.')

        var promise;

        // if valid, `customer` is an array
        let customer = D.get(qboCustomer, 'QueryResponse.Customer')

        if (customer) {

            // if there is an existing customer, update the details
            customer = customer[0]

            debug('Customer exists:')
            debug(D.get(customer, 'DisplayName'))

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
            debug('Customer don\'t exist. Will create new one.')
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
            promise = QBO.createCustomerAsync(newCustomer).catch(error => {
                // sometimes updating customer causes error
                if (D.get(error, 'Fault')) {

                    debug('Error in creating customer:')
                    try {
                        debug(JSON.stringify(error))
                    } catch(err) {
                        debug('Unable to stringify error.')
                    }

                    // if there are more than one error, throw
                    let errors = error.Fault.Error;

                    if ( errors.length === 1 && (D.get(errors[0], 'code') === "5010") ) {

                        // we don't need this to fail, so just log.
                        console.log('Note: ' + errors[0].Message + ' for updating customer ' + _CUSTOMER.Id + ' ' + _CUSTOMER.DisplayName);

                    } else if ( errors.length === 1 && (D.get(errors[0], 'code') === "6240") ) {

                        // 6240 is where this current customer has the same name as an existing one.
                        // solution is to add a random short string
                        let newCustomer = {}

                        // the minimum
                        D.set(newCustomer, 'PrimaryEmailAddr.Address', _TRANSACTION.details.customerEmail)
                        D.set(newCustomer, 'DisplayName', _TRANSACTION.details.customerName + ' ' + Math.random().toString(36).substring(2, 7))

                        // other information

                        // address
                        if (_TRANSACTION.details.address) D.set(newCustomer, 'BillAddr.Line1', _TRANSACTION.details.address)
                        if (_TRANSACTION.details.addressZip) D.set(newCustomer, 'BillAddr.PostalCode', _TRANSACTION.details.addressZip)
                        if (_TRANSACTION.details.addressCountry) D.set(newCustomer, 'BillAddr.Country', _TRANSACTION.details.addressCountry)

                        // create the customer
                        return QBO.createCustomerAsync(newCustomer)

                    } else {

                        let error = new Error('QBO error. See `QBOResponse` for more information.')
                        error.QBOResponse = customer
                        error.category = 'QBO'
                        throw error

                    }
                } else {
                    throw error
                }

            })
        }

        return promise

    }).then((customer) => {

        debug('Customer created or found.')

        // no errors are thrown, proceed.
        _CUSTOMER = {
            Id: customer.Id,
            DisplayName: customer.DisplayName
        }



        /* STRIPE COMMISSION / EXPENSE */

        // if paymentMethod is stripe, create expense - expense is called `purchase` by QuickBooks
        let paymentMethodIsCreditCard = (
            _TRANSACTION.paymentMethod.toLowerCase().indexOf('credit') === 0 ||
            _TRANSACTION.paymentMethod.toLowerCase().indexOf('stripe') === 0 ) // BACKWARD COMPATIBILITY SUPPORT (21 Nov 2019): 'stripe' was renamed to 'credit card'

        if (paymentMethodIsCreditCard) {

            debug('Payment was via credit card.')

            let getStripeCharge = require(__appsDir + '/stripe/getStripeCharge')

            return getStripeCharge(_TRANSACTION.salesOrderNumber).then(charge => {

                if (!charge) throw new Error('Transaction payment method is stripe, but no stripe charge found on StripeEvent.')

                const calculateStripeCommissionAmount = require(__appsDir + '/stripe/calculateStripeCommissionAmount')

                let stripeComms = calculateStripeCommissionAmount(charge)

                var expense = require(__appsDir + '/QBO/QBOPurchase')(_TRANSACTION.details, stripeComms)
                debug('Stripe commission expense:')
                debug(expense)

                return QBO.createPurchaseAsync(expense)

            })

        } else {

            return false
        }

    }).then(expense => {

        debug('Expense created.')
        //debug(expense)

        _CREATED_EXPENSE = expense

        if (D.get(expense, 'Fault')) {
            let error = new Error('QBO error for expense. See `QBOResponse` for more information.')
            error.QBOResponse = expense
            error.category = 'QBO'
            throw error
        }


        /* SALES RECEIPT or INVOICE (Bank Transfer) */

        // once customer is created/updated, create the sales receipt
        let salesReceipt = require(__appsDir + '/QBO/QBOSalesReceipt/index.js')(_TRANSACTION, _CUSTOMER)

        // comments
        if (req.body.comments) salesReceipt.PrivateNote = req.body.comments;

        debug('Sales receipt/Invoice:')
        debug(salesReceipt)

        // if "DepositToAccountRef" is missing, it indicates that it is invoice
        var isInvoice = !salesReceipt.DepositToAccountRef
        if (isInvoice) {
            debug('Document type is an invoice. Creating invoice...')
            return QBO.createInvoiceAsync(salesReceipt)
        } else {
            debug('Document type is a sales receipt. Creating sales receipt...')
            return QBO.createSalesReceiptAsync(salesReceipt)
        }

    }).then(salesReceipt => {

        _CREATED_SALES_RECEIPT = salesReceipt

        if (D.get(salesReceipt, 'Fault')) {
            let error = new Error('QBO error for sales receipt. See `QBOResponse` for more information.')
            error.QBOResponse = salesReceipt
            error.category = 'QBO'
            throw error
        }


        /* JOURNAL ENTRY FOR COGS */

        // create journal entry
        let journal = (parseFloat(_COGS) > 0) ? require(__appsDir + '/QBO/QBOJournalCOGS')(_TRANSACTION.details, _COGS): false
        debug(journal)

        if (journal) return QBO.createJournalEntryAsync(journal)

        return journal

    }).then(journalEntry => {

        _CREATED_JOURNAL = journalEntry

        if (D.get(journalEntry, 'Fault')) {
            let error = new Error('QBO error for COGS journal entry. See `QBOResponse` for more information.')
            error.QBOResponse = journalEntry
            error.category = 'QBO'
            throw error
        }

        //then finally update the entry as completed.
        _TRANSACTION.status = 'completed';
        _TRANSACTION.comments = req.body.comments
        if (_CREATED_SALES_RECEIPT && D.get(_CREATED_SALES_RECEIPT, "Id")) _TRANSACTION.qboSalesReceiptId =_CREATED_SALES_RECEIPT.Id
        if (_CREATED_EXPENSE && D.get(_CREATED_EXPENSE, "Id")) _TRANSACTION.qboStripeExpenseId = _CREATED_EXPENSE.Id
        if (_CREATED_JOURNAL && D.get(_CREATED_JOURNAL, "Id")) _TRANSACTION.qboCOGSJournalId = _CREATED_JOURNAL.Id

        return _TRANSACTION.save().catch(function(err) {

            console.log('CRITICAL: Transaction for sales order ' + _TRANSACTION.salesOrderNumber + ' cannot be saved as completed. Reversing all entries.');

            // don't gobble up the error.
            throw err

        })

    })
    .then(transaction => {
        res.send({ success: true });
    })
    .catch(function (err) {

        API_ERROR_HANDLER(err, req, res, next)

        // if anything goes wrong, attempt to delete all the documents
        require(__appsDir + '/QBO/deleteAllEntriesIfSomeErrorsOccur')(_CREATED_SALES_RECEIPT, _CREATED_EXPENSE, _CREATED_JOURNAL)

    })

})

router.post('/deliver', permit('/deliver', 8), (req, res, next) => {

    DB.Transaction.findOne({
        where: { TransactionID: req.body.TransactionID },
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
                model: DB.StorageLocation
            }, {
                model: DB.Inventory
            }]
        }]
    }).then(transaction => {

        if(!transaction) {
            let error = new Error('Unable to find the transaction.')
            throw error
        }

        if(transaction.status !== 'completed') {
            if(transaction.status === 'delivered') {
                let error = new Error('Transaction inventory deduction already done.')
                throw error
            }
            let error = new Error('Transaction status is incorrect. Please refresh data.')
            throw error
        }

        return DB.sequelize.transaction(t => {

            return PROMISE.resolve().then(() => {

                let promises = []

                //record inventory movement
                let createInventoryRecord = require(__appsDir + '/inventory/createInventoryRecord')

                // same for DB calls "required" from outside, it will be outside of this CLS scoping, need to manually pass `t`
                let recordMovement = createInventoryRecord(t, 'delivery', transaction, req.user)
                promises.push(recordMovement)

                transaction.status = 'delivered';
                promises.push(transaction.save())

                transaction.Inventory_Storages.forEach(inventoryDelivered => {

                    let phyiscalInventoryID = inventoryDelivered.Inventory_StorageID;
                    let quantityDelivered = inventoryDelivered.SoldInventory.quantity;

                    promises.push(DB.Inventory_Storage.update({
                        quantity: DB.sequelize.literal( 'quantity - ' + parseInt(quantityDelivered) )
                    }, {
                        where: { Inventory_StorageID: phyiscalInventoryID },
                        transaction: t // forEach seemed to be out of the CLS scoping, need to manually pass `t`
                    }))

                })

                // this is important for transaction to work, if not you need to call spread
                // otherwise commit will be called when the first DB action completes without error.
                return PROMISE.all(promises)

            })

        })

    }).spread((recordMovement) => {

        //TODO: create a webhook styled approach to separate/decouple auxilary operations cleanly
        return completeAsanaTask(recordMovement, req.body.user, req.body.dontCompleteAsanaTask)

    }).then(() => {

        return res.send({
            success: true
        })

    }).catch(error => { API_ERROR_HANDLER(error, req, res, next) })

});

module.exports = router;
