'use strict'

const debug = require('debug')('nn:apps:inventoryReportGenerator:full')
debug.log = console.log.bind(console)
const inventoryTimeLineFilter = require('../inventory/timelineFilter')

const reportType = 'renford'

let inventoryIncludes = [{
    // include all the places which the inventories are stored.
    model: DB.StorageLocation,
    where: { name: 'Renford' },
    require: true,
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
}]

function generate() {


    return DB.Inventory.findAll({
        where: {
            notActive: { $not: true}
        },
        order: [ ['sku', 'ASC'], ['name', 'ASC'] ],
        include: inventoryIncludes
    }).then(inventories => {

        return DB.InventoryReport.create({
            reportType: reportType,
            data: inventories
        }, {
            logging: false,
            returning: false
        })

    }).then(() => {
        console.log('Renford inventory report successfully logged.')
        return false
    }).catch(error => {
        error.message = 'Failed to generate ' + reportType + ' report. ' + (error.message ? error.message : '')
        error.level = 'high'
        error.status = 500
        throw error
    })


}

module.exports = generate
