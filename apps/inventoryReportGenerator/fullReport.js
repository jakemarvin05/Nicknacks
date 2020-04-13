'use strict'

const debug = require('debug')('nn:apps:inventoryReportGenerator:full')
debug.log = console.log.bind(console)
const inventoryTimeLineFilter = require('../inventory/timelineFilter')

const reportType = 'full'

const inventoryIncludes = [{

    // include all the places which the inventories are stored.
    model: DB.StorageLocation,
    through: {
        // and the quantites of how many inventories stored is in the cross table
        model: DB.Inventory_Storage,
        attributes: [
            'Inventory_StorageID',
            'StorageLocation_storageLocationID',
            'Inventory_inventoryID',
            'quantity'
        ]
    }

}, {

    // also need to include its transit inventory
    model: DB.TransitInventory,
    where: { isInventorised: false },
    required: false,
    attributes: [
        'TransitInventoryID',
        'Inventory_inventoryID',
        'quantity'
    ],
    include: [{
        model: DB.Shipment,
        attributes: [
            'name', 'estimatedShipOut', 'actualShipOut', 'expectedArrival', 'remarks'
        ]
    }]
}]

const inventoryStorageIncludes = [{
    model: DB.Transaction,
    where: { status: { $not: 'delivered' } },
    through: {
        model: DB.SoldInventory,
        attributes: [
            'SoldInventoryID',
            'quantity',
            'Inventory_Storage_inventory_StorageID',
            'Transaction_transactionID'
        ]
    },
    required: true
}]

function generate() {

    return PROMISE.resolve().then(() => {

        return [
            DB.Inventory.findAll({
                where: {
                    notActive: { $not: true}
                },
                order: [ ['sku', 'ASC'], ['name', 'ASC'] ],
                include: inventoryIncludes
            }),

            DB.Inventory_Storage.findAll({
                include: inventoryStorageIncludes
            })
        ]

    }).spread( (inventories, soldInventories) => {


        // merge inventories with soldInventories
        inventories = JSON.parse(JSON.stringify(inventories));
        soldInventories = JSON.parse(JSON.stringify(soldInventories));

        // for each of the soldInventories record
        soldInventories.forEach(element => {

            // find the matching inventory from the inventory list
            var matchedInventory = inventories.find(item => {
                if (item.InventoryID === element.Inventory_inventoryID) return item;
            });

            // past sold inventories could have gone obsolete (deleted or deactivated)
            // can stop the operations here.
            // matchedInventory is undefined when nothing is found:
            if (!matchedInventory) return;

            // joining this particular soldInventory line item to the inventory line item
            if (Array.isArray(matchedInventory.soldInventories)) {
                matchedInventory.soldInventories.push(element);
            } else {
                matchedInventory.soldInventories = [ element ];
            }


            // calculating for quantities sold
            var quantitySold = 0;

            // for each of the transactions within this soldInventory
            // NOTE: a single line of soldInventory is a pair between Transaction and
            //       a particular physical inventory stored at a place (Inventory_Storage)
            element.Transactions.forEach( element => {
                quantitySold += parseInt(element.SoldInventory.quantity)
            });

            var soldStockObject = matchedInventory.stock.find( item => {
                if (item.name === "Sold") return item;
                return false;
            })

            if (soldStockObject) {
                soldStockObject.quantity += quantitySold;
            } else {

                if (!matchedInventory.stock) {
                    matchedInventory.stock = {name: "Sold", quantity: quantitySold }
                } else {
                    matchedInventory.stock.push({name: "Sold", quantity: quantitySold })
                }

            }

        });

        // Loop through the transit inventories to generate the Transit object.
        inventories.forEach(inventory => {

            let transitStock = { name: 'Transit', quantity: 0 };

            inventory.TransitInventories.forEach(transit => {
                transitStock.quantity += parseInt(transit.quantity)
            });

            if (!inventory.stock) {
                inventory.stock = [transitStock]
            } else {
                inventory.stock.push(transitStock)
            }

        })

        inventories.forEach(inventory => {
            inventory.timeline = inventoryTimeLineFilter(inventory)
        })

        return DB.InventoryReport.create({
            reportType: reportType,
            data: inventories
        }, {
            logging: false,
            returning: false
        })

    }).then(() => {
        console.log('Full inventory report successfully logged.')
        return false
    }).catch(error => {
        error.message = 'Failed to generate ' + reportType + ' report. ' + (error.message ? error.message : '')
        error.level = 'high'
        error.status = 500
        throw error
    })


}

module.exports = generate
