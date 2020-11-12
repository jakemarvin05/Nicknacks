'use strict'

module.exports = {
    "Stripe Vendor": {
        "value": "28",
        "name": "Stripe Commission",
        "type": "Vendor"
    },

    "Stripe GST": {
        "value": "12" // 0% OS
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

    "Sales Receipt GST": {
        "value": "6" // 7% SR
    },

    "Refund Journal Tax Detail GST": {
        "value": "5" // 7% TX
    }
}