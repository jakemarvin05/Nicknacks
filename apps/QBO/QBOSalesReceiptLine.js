const QBOSalesReceiptLine = (transactionDetails) => {

    let defaults = [
        {
            //"Id": "1",
            "LineNum": 1,
            "Description": transactionDetails.generalDescription,
            "Amount": transactionDetails.totalAmountExcludeTax,
            "DetailType": "SalesItemLineDetail",
            "SalesItemLineDetail": {

                // currently just peg everything as custom
                "ItemRef": {
                    "value": "42",
                    "name": "Custom item"
                },
                "UnitPrice": transactionDetails.totalAmountExcludeTax,
                "Qty": 1,
                "TaxCodeRef": {
                    "value": "6"
                }
            }
        },{
            "Amount": transactionDetails.totalAmountExcludeTax,
            "DetailType": "SubTotalLineDetail",
            "SubTotalLineDetail": {}
        }
    ]

    return defaults
}
module.exports = QBOSalesReceiptLine;
