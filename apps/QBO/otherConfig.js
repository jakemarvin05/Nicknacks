'use strict'

const otherConfig = {
    "Stripe Vendor": {
        "value": "28",
        "name": "Stripe Commission",
        "type": "Vendor"
    },

    // "Stripe GST": {
    //     "value": "12" // 0% OS
    // },

    "Stripe GST": {
        "value": "11" // Out of Scope
    },

    // sales receipt payment method
    "Credit Card": {
        "value": "3",
        "name": "Credit Card"
    },

    "Bank Transfer": {
        "value": "4",
        "name": "Bank Transfer"
    },

    // the item for a single-line sales receipt
    "Sales Receipt Item": {
        "value": "42",
        "name": "Custom item"
    },

    // TaxCode
    "Sales Receipt GST": {
        "value": "6" // 7% SR
    },

//     may not require this anymore as the refund journal tax is explicit on GST control.
//     "Refund Journal Tax Detail GST": {
//         "value": "5" // 7% TX
//     }

    // somehow there's tax rate and there's tax code.
    // TaxCode applied to products. Rates applied to calculation.
    "Sales Receipt TaxRate": {
        "value": "5" // 7% TX
    }
}
module.exports = Object.freeze(otherConfig)
