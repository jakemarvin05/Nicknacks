"use strict"

const accountList = require('../accountList.js')
const otherConfig = require('../otherConfig.js')

module.exports = (transactionDetails) => {
    let tax = transactionDetails.totalAmount - transactionDetails.totalAmountExcludeTax
    return {
        "TotalTax": tax,
        "TaxLine": [
            {
                "Amount": tax,
                "DetailType": "TaxLineDetail",
                "TaxLineDetail": {
                    "TaxRateRef": otherConfig["Sales Receipt TaxRate"],
                    "PercentBased": true,
                    "NetAmountTaxable": transactionDetails.totalAmountExcludeTax
                }
            }
        ]
    }
}