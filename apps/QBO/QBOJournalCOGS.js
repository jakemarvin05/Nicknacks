const accountList = require('./accountList.js')

const QBOJournalCOGS = (transactionDetails, COGS) => {

    let defaults = {
        "DocNumber": 'SO' + transactionDetails.salesOrderNumber + '-COGS',
        "TxnDate": transactionDetails.transactionDateQBOFormat,
        "PrivateNote": "COGS: " + transactionDetails.generalDescription + "($" + COGS + ")",
        "TotalAmt": COGS
    }

    defaults.Line = [
        {
            "Id": "0",
            "Description": defaults.PrivateNote,
            "Amount": COGS,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Credit",
                "AccountRef": accountList["Inventory Asset"]
                // ,
                // "TaxCodeRef": {
                //   "value": "17"
                // },
                // "TaxApplicableOn": "Purchase",
                // "TaxAmount": 0.0
            }
        },
        {
            "Id": "1",
            "Description": defaults.PrivateNote,
            "Amount": COGS,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Debit",
                "AccountRef": accountList["Cost of Sales"]
                // ,
                // "TaxCodeRef": {
                //   "value": "17"
                // },
                // "TaxApplicableOn": "Purchase",
                // //"TaxAmount": 0.0
            }
        }
    ]

  return defaults;

}

module.exports = QBOJournalCOGS;
