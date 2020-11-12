const accountList = require('./accountList.js')
const otherConfig = require('./otherConfig.js')

const QBOPurchase = (transactionDetails, stripeCommission) => {
    let defaults = {
        "AccountRef": accountList["Stripe Transit"],
        "PaymentMethodRef": {
            "value": "1"
        },
        "PaymentType": "Cash",
        "EntityRef": otherConfig["Stripe Vendor"],
        "GlobalTaxCalculation": "TaxExcluded"
        // "Line": [
        //   {
        //     "Amount": 10.00,
        //     "DetailType": "AccountBasedExpenseLineDetail",
        //     "AccountBasedExpenseLineDetail": {
        //      "AccountRef": {
        //         "name": "Meals and Entertainment",
        //         "value": "13"
        //       }
        //     }
        //   }
        // ]

    }

    defaults.TxnDate = transactionDetails.transactionDateQBOFormat
    defaults.DocNumber = 'SO' + transactionDetails.salesOrderNumber

    //description
    let description = 'SO: ' + transactionDetails.salesOrderNumber
    description += ', Name:' + transactionDetails.customerName
    description += ', Email: ' + transactionDetails.customerEmail

    defaults.Line = [
      {
        // convert totalAmount to 100s and take 3.4%, round off, then convert back to 2 decimals, add 50 cents
        "Amount": stripeCommission,
        "DetailType": "AccountBasedExpenseLineDetail",
        "Description": description,
        "AccountBasedExpenseLineDetail": {
          "AccountRef": accountList["Stripe Charges"],
          "BillableStatus": "NotBillable",
          "TaxCodeRef": otherConfig["Stripe GST"]
        }
      }
    ]

    return defaults

}
module.exports = QBOPurchase;
