const accountList = require('./accountList.js')
const otherConfig = require('./otherConfig.js')

const QBOSalesReceiptModel = (transaction, customer) => {

    let defaults = {
        "domain": "QBO",
        "sparse": false,
        //"Id": "11", //required for updates
        //"SyncToken": "0", //required for updates
        // "MetaData": {
        //   "CreateTime": "2014-09-16T14:59:48-07:00",
        //   "LastUpdatedTime": "2014-09-16T14:59:48-07:00"
        // }, // optional
        // "CustomField": [
        //   {
        //     "DefinitionId": "1",
        //     "Name": "Crew #",
        //     "Type": "StringType"
        //   }
        // ],
        //"DocNumber": "1003",
        //"TxnDate": "2014-09-14",
        // "Line": [
        //   {
        //     "Id": "1",
        //     "LineNum": 1,
        //     "Description": "Custom Design",
        //     "Amount": 337.5,
        //     "DetailType": "SalesItemLineDetail",
        //     "SalesItemLineDetail": {
        //       "ItemRef": {
        //         "value": "4",
        //         "name": "Design"
        //       },
        //       "UnitPrice": 75,
        //       "Qty": 4.5,
        //       "TaxCodeRef": {
        //         "value": "NON"
        //       }
        //     }
        //   },
        //   {
        //     "Amount": 337.5,
        //     "DetailType": "SubTotalLineDetail",
        //     "SubTotalLineDetail": {}
        //   }
        // ],
        // "TxnTaxDetail": {
        //   "TotalTax": 0
        // },
        // "CustomerRef": {
        //   "value": "6",
        //   "name": "Dylan Sollfrank"
        // },
        // "CustomerMemo": {
        //   "value": "Thank you for your business and have a great day!"
        // },
        // "BillAddr": {
        //   "Id": "49",
        //   "Line1": "Dylan Sollfrank",
        //   "Lat": "INVALID",
        //   "Long": "INVALID"
        // },
        //"TotalAmt": 337.5,
        "ApplyTaxAfterDiscount": false,
        // "PrintStatus": "NotSet",
        // "EmailStatus": "NotSet",
        "Balance": 0,
        "PaymentMethodRef": otherConfig["Credit Card"],
        //"PaymentRefNum": "10264",

        // default to stripe transit account
        "DepositToAccountRef": accountList["Stripe Transit"]
    }

    // customer
    defaults.CustomerRef = {
        value: customer.Id,
        name: customer.DisplayName
    }

    //dates and references
    defaults.TxnDate = transaction.details.transactionDateQBOFormat
    defaults.DocNumber = 'SO' + transaction.details.salesOrderNumber

    // total amount
    defaults.TotalAmt = transaction.details.totalAmount

    // there is credit card and credit card (mw), conduct loose check and apply same rules to both.
    if (transaction.paymentMethod.toLowerCase().indexOf('credit card') === 0) {

        // now that stripe object is separately stored, cannot retrieve.
        //defaults.PaymentRefNum = transaction.transactionReferenceCode

        return defaults
    }

    // BACKWARD COMPATIBILITY SUPPORT (21 Nov 2019): 'stripe' was renamed to 'credit card'
    // there is stripe and stripe (mw), conduct loose check and apply same rules to both.
    if (transaction.paymentMethod.toLowerCase().indexOf('stripe') === 0) {

        // now that stripe object is separately stored, cannot retrieve.
        //defaults.PaymentRefNum = transaction.transactionReferenceCode

        return defaults
    }

    if (transaction.paymentMethod.toLowerCase().indexOf('bank transfer') === 0) {

        defaults.PaymentMethodRef = otherConfig["Bank Transfer"]
        defaults.DepositToAccountRef = accountList["Accounts Receivable"]
        return defaults
    }

    // there is mobile payment and mobile payment (mw), conduct loose check and apply same rules to both.
    if (transaction.paymentMethod.toLowerCase().indexOf('mobile payment') === 0) {

        defaults.PaymentMethodRef = otherConfig["Bank Transfer"]
        defaults.DepositToAccountRef = accountList["DBS Current"]
        return defaults
    }

    // TODO: Hoolah, should put it under a sub account of accounts receivable.
    // if (transaction.paymentMethod.toLowerCase().indexOf('instalment') === 0) {
    //
    //     defaults.DepositToAccountRef.value = "77"
    //     defaults.DepositToAccountRef.name = "Accounts Receivable"
    //
    //     return defaults
    // }

    if (transaction.paymentMethod.toLowerCase() === 'no payment information required') {

        defaults.PaymentMethodRef = otherConfig["Bank Transfer"]
        defaults.DepositToAccountRef = accountList["DBS Current"]
        return defaults
    }

    throw new Error('`paymentMethod` invalid.')
}
module.exports = QBOSalesReceiptModel;
