'use strict'

const accountList = require('./accountList.js')
const otherConfig = require('./otherConfig.js')


function salesAmt(amount, tax = 7) {
    let inCents = amount * 100

    function round(inCents) {
        return Math.round(inCents)/100
    }
    
    return {
        total: amount,
        totalWithoutGST: round(inCents/(100+tax)*100),
        GST: round(inCents/(100+tax)*tax)
    }
}

module.exports = (
    transaction,
    amount,
    tax,
    stripeCommissionReturned    
) => {
    
    var amount = salesAmt(amount)
    
    return {
        "DocNumber": transaction.salesOrderNumber + '-STRIPE-R',
        "TxnDate": MOMENT().format('YYYY-MM-DD'),
        "PrivateNote": "Refund for " + transaction.details.salesOrderNumber,
        "Line": [{
            // credit stripe transit cash for refund
            "Id": "0",
            "Amount": amount.total,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                // take out from stripe transit account
                "PostingType": "Credit",
                "AccountRef": accountList["Stripe Transit"]
            }
        }, {
            // debit sales refund
            "Amount": amount.totalWithoutGST,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Debit",
                "AccountRef": accountList["Sales Refund"]
            }
        }, {
            // debit GST control
            "Amount": amount.GST,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Debit",
                "AccountRef": accountList["GST Control"]
            }
        }, {
            // debit stripe transit because stripe will return some money in refund.
            "Id": "1",
            "Amount": stripeCommissionReturned,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Debit",
                "AccountRef": accountList["Stripe Transit"],
            }
        }, {
            // credit expenses to lower expenses from recovered stripe commission
            "Amount": stripeCommissionReturned,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Credit",
                "AccountRef": accountList["Stripe Charges"]
            }
        }]
    }
}
