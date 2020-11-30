'use strict'

const otherConfig = {

    "Stripe Vendor": {
        "value": "2",
        "name": "Stripe Commission",
        "type": "Vendor"
    },

    // TaxCode
    "Stripe GST": {
        "value": "21" // Out of Scope
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

    // to change
    // the item for a single-line sales receipt
    "Sales Receipt Item": {
        "value": "2",
        "name": "Custom item"
    },

    // TaxCode
    "Sales Receipt GST": {
        "value": "8" // 7% SR
    },

    // somehow there's tax rate and there's tax code.
    // TaxCode applied to products. Rates applied to calculation.
    // Title a bit misleanding, but is referring to TaxCode QBO object
    "Sales Receipt TaxRate": {
        "value": "9" // 7% TX
    }
}
module.exports = Object.freeze(otherConfig)
