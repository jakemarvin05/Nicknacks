var express = require('express');
var router = express.Router();
var qs = require('querystring');
var QuickBooks = require('node-quickbooks');
var request = require('request');
var rp = require('request-promise');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});


router.post('/charge-succeeded', function (req, res) {

    if(req.query.token !== process.env.STRIPE_SIMPLE_TOKEN) return res.status(403).send();

    // save the data
    return DB.Transaction.create({
        transaction: req.body,
        status: 'pending',
        eventType: 'charge-succeeded'
    })
    .then(function (transaction) {
        // send success
        return res.send({
            success: true
        });
    })
    .catch(function (err) {
        // log the error
        console.log(err);

        res.status(500).send();
    });

});

router.post('/refunded', function (req, res) {

    if(req.query.token !== process.env.STRIPE_SIMPLE_TOKEN) return res.status(403).send();

    // save the data
    return DB.Transaction.create({
        transaction: req.body,
        status: 'pending',
        eventType: 'refunded'
    })
    .then(function (transaction) {
        // send success
        return res.send({
            success: true
        });
    })
    .catch(function (err) {
        // log the error
        console.log(err);

        res.status(500).send();
    });

});

router.get('/test', function(req, res) {
    QBO.findAccountsAsync(function(_, accounts) {
      accounts.QueryResponse.Account.forEach(function(account) {
        console.log(account.Name)
      })
    })
})

router.post('/create-sales-receipt', function(req, res) {

    var _TRANSACTION, _CUSTOMER, _SALESRECEIPT;
    DB.Transaction.findById(req.body.transactionID).then(function(transaction) {

        _TRANSACTION = transaction;

        // if somehow there is not customerEmail, which is our minimum requirement,
        // we will fail the server
        if (!transaction.customerEmail) {
            // SEND EMAIL !!!
            throw 'CRITICAL: There is no email given in the stripe transaction.';
        }

        return QBO.findCustomersAsync([{
            field: 'PrimaryEmailAddr', value: transaction.customerEmail
        }]);

    }).then(function(qboCustomer) {

        // if valid, `customer` is an array 
        var customer = D.get(qboCustomer, 'QueryResponse.Customer');
        
        if (customer) {

            // if there is an existing customer, update the details

            customer = customer[0];

            // we save customer id and name into private global
            // because QuickBooks may error the updating of customer
            // which is not critical to creation of sales receipt
            // so we need the id and name to continue
            _CUSTOMER = {
                Id: customer.Id,
                DisplayName: customer.DisplayName
            };

            // get and increment the sync token
            var syncToken = D.get(customer, 'SyncToken');
            syncToken = parseInt(syncToken) + 1;

            // set all the updates
            var sparseUpdates = {
                Id: customer.Id,
                SyncToken: syncToken,
                Active: true,
                sparse: true
            };

            if (_TRANSACTION.address) D.set(sparseUpdates, 'BillAddr.Line1', _TRANSACTION.address);
            if (_TRANSACTION.addressZip) D.set(sparseUpdates, 'BillAddr.PostalCode', _TRANSACTION.addressZip);
            if (_TRANSACTION.addressCountry) D.set(sparseUpdates, 'BillAddr.Country', _TRANSACTION.addressCountry);
        
            // do the update
            return QBO.updateCustomerAsync(sparseUpdates);

        } else {

            // if there is no existing customer, create a new one.
            var newCustomer = {};

            // the minimum
            D.set(newCustomer, 'PrimaryEmailAddr.Address', _TRANSACTION.customerEmail);
            D.set(newCustomer, 'DisplayName', _TRANSACTION.customerName);

            // other information

            // address
            if (_TRANSACTION.address) D.set(newCustomer, 'BillAddr.Line1', _TRANSACTION.address);
            if (_TRANSACTION.addressZip) D.set(newCustomer, 'BillAddr.PostalCode', _TRANSACTION.addressZip);
            if (_TRANSACTION.addressCountry) D.set(newCustomer, 'BillAddr.Country', _TRANSACTION.addressCountry);

            // create the customer
            return QBO.createCustomerAsync(newCustomer);
        }

    }).then(function(customer) {

        // sometimes updating customer causes error
        if (D.get(customer, 'Fault')) {

            // if there are more than one error, throw
            var errors = customer.Fault.Error;
            if (errors.length > 1) throw customer;

            // if there are less than 1 error, check if it is
            // stale object 5010

            if (errors[0].code === "5010") {
                console.log('Note: ' + errors[0].Message + ' for updating customer ' + _CUSTOMER.Id + ' ' + _CUSTOMER.DisplayName);
            } else {
                throw customer;
            }

        }

        var promises = [];

        // common info for QBO
        var DocNumber, TxnDate;

        // once customer is created/updated, create the sales receipt
        var salesReceipt = require('../apps/QBOSalesReceipt');


        // customer
        D.set(salesReceipt, 'CustomerRef', {
            // use _CUSTOMER which is updated further upstream
            // to prevent quickbooks from screwing things up.
            value: _CUSTOMER.Id,
            name: _CUSTOMER.DisplayName
        });

        // transaction date
        TxnDate = salesReceipt.TxnDate = _TRANSACTION.transactionDateQBOFormat;
        salesReceipt.PaymentRefNum = _TRANSACTION.transactionReferenceCode;
        //salesReceipt.TxnSource = 'stripe'; //invalid enumeration

        // reference number
        DocNumber = salesReceipt.DocNumber = salesReceipt.PrivateNote = _TRANSACTION.salesOrderNumber.replace('#', '');

        // create single product line
        // to upgrade this portion when magento can send meta data
        salesReceipt.Line = [
          {
            //"Id": "1",
            "LineNum": 1,
            "Description": _TRANSACTION.generalDescription,
            "Amount": _TRANSACTION.totalAmount,
            "DetailType": "SalesItemLineDetail",
            "SalesItemLineDetail": {

              // currently just peg everything as custom
              "ItemRef": {
                "value": "42",
                "name": "Custom item"
              },
              "UnitPrice": _TRANSACTION.totalAmount,
              "Qty": 1,
              "TaxCodeRef": {
                "value": "15"
              }
            }
          },
          {
            "Amount": _TRANSACTION.totalAmount,
            "DetailType": "SubTotalLineDetail",
            "SubTotalLineDetail": {}
          }
        ];

        salesReceipt.TotalAmt = _TRANSACTION.totalAmount;

        var createSalesReceipt = QBO.createSalesReceiptAsync(salesReceipt);
        promises.push(createSalesReceipt);

        // create expense - expense is called `purchase` by QuickBooks
        var expense = require('../apps/QBOPurchase');

        expense.DocNumber = DocNumber;
        expense.TxnDate = TxnDate;

        expense.Line = [
          {
            // convert totalAmount to 100s and take 3.4%, round off, then convert back to 2 decimals, add 50 cents
            "Amount": Math.round(_TRANSACTION.totalAmount * 100 * 0.034)/100 + 0.50,
            "DetailType": "AccountBasedExpenseLineDetail",
            "AccountBasedExpenseLineDetail": {
              "AccountRef": {
                "value": "33",
                "name": "Stripe Charges"
              },
              "BillableStatus": "NotBillable",
              "TaxCodeRef": {
                "value": "9"
              }
            }
          }
        ];
        var createExpense = QBO.createPurchase(expense);
        promises.push(createExpense);

        // create journal entry


        return promises;

    }).spread(function(salesReceipt, expense) {
        console.log(expense);

        var errors = []
        

        // pushing errors
        if (D.get(salesReceipt, 'Fault')) errors.push(salesReceipt);

        if (errors.length > 0) {
            // deleteAllEntriesItSomeErrorsOccur
            throw errors;
        }


        //then finally update the entry as completed.

    })
    .catch(function (err) {
        // log the error

        console.log('CRITICAL: ' + err);
        if (typeof err === "object") console.log(JSON.stringify(err));
        if (D.get(err, 'stack')) console.log(err.stack);

        res.status(500).send(JSON.stringify(err));

    });

    

    function deleteAllEntriesIfSomeErrorsOccur(salesReceipt, expense, journalCOGS) {

    }
});


module.exports = router;
