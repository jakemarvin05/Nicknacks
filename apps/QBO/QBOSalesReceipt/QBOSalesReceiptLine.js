const accountList = require('./../accountList.js')
const otherConfig = require('./../otherConfig.js')

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
                "ItemRef": otherConfig["Sales Receipt Item"],
                "UnitPrice": transactionDetails.totalAmountExcludeTax,
                "Qty": 1,
                "TaxCodeRef": otherConfig["Sales Receipt GST"]
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
