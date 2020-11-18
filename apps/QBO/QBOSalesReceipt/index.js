"use strict"

const salesReceiptModel = require('./QBOSalesReceipt.js')
const salesLineModel = require('./QBOSalesReceiptLine.js')
const taxDetailModel = require('./QBOSalesTax.js')

module.exports = (transaction, customer) => {
    // once customer is created/updated, create the sales receipt
    let salesReceipt = salesReceiptModel(transaction, customer)
    //debug(salesReceipt)

    // create single product line
    // to upgrade this portion when magento can send meta data
    let lines = salesLineModel(transaction.details)
    //debug(lines)

    salesReceipt.Line = lines

    salesReceipt.TxnTaxDetail = taxDetailModel(transaction.details)

    return salesReceipt
}