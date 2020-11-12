'use strict'

const accountList = require('./accountList.js')
const otherConfig = require('./otherConfig.js')

module.export = (
    transaction,
    amount,
    tax,
    stripeCommissionReturned    
) => {
    return {
        "DocNumber": transaction.salesOrderNumber + '-STRIPE-REFUND',
        "TxnDate": MOMENT().format('YYYY-MM-DD'),
        "PrivateNote": "Refund for " + transaction.details.salesOrderNumber,
        "Line": [{
            // credit stripe transit cash for refund
            "Id": "0",
            "Amount": amount,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                // take out from stripe transit account
                "PostingType": "Credit",
                "AccountRef": accountList["Stripe Transit"],
                "TaxApplicableOn": "Sales",
                "TaxCodeRef": otherConfig["Sales Receipt GST"],
                "TaxAmount": tax
            }
        }, {
            // debit sales refund
            "Amount": amount,
            "DetailType": "JournalEntryLineDetail",
            "JournalEntryLineDetail": {
                "PostingType": "Debit",
                "AccountRef": accountList["Sales Refund"],
                "TaxApplicableOn": "Sales",
                "TaxCodeRef": otherConfig["Sales Receipt GST"],
                "TaxAmount": tax
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
        }],
        "TxnTaxDetail": {
            "TaxLine": [
                {
                    "Amount": 0,
                    "DetailType": "TaxLineDetail",
                    "TaxLineDetail": {
                        "TaxRateRef": otherConfig["Refund Journal Tax Detail GST"],
                        "PercentBased": true,
                        "TaxPercent": 7,
                        "NetAmountTaxable": 0
                    }
                }
            ]
        }
    }
}