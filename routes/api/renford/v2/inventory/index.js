const express = require('express')
const router = express.Router()
const permit = require(__appsDir + '/passport/permit')('/api/v2/inventory')
const debug = require('debug')('nn:api:inventory')
debug.log = console.log.bind(console)
const singleInventoryProcessor = require(__appsDir + '/inventory/singleInventoryProcessor')
const createInventoryRecord = require(__appsDir + '/inventory/createInventoryRecord')
const _ = require('lodash')
const inventoryTimeLineFilter = require(__appsDir + '/inventory/timelineFilter')
const stockChartSeries = require(__appsDir + '/inventory/stockChartSeries')

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

router.get('/all', permit('/all', 0), (req, res, next) => {

    DB.Inventory.findAll({
        where: {
            notActive: { $not: true}
        },
        order: [ ['sku', 'ASC'], ['name', 'ASC'] ],
        include: inventoryIncludes,
        attributes: [
            'InventoryID',
            'name',
            'sku',
            'comments',
            'data',
            'cbm'
        ]
    }).then(inventories => {

        res.send({
            success: true,
            data: inventories
        })

    }).catch(error => { API_ERROR_HANDLER(error, req, res, next) })

})

router.get('/storage-report/all', permit('/storage-report/all', 0), function(req, res, next) {

    debug(req.body);

    return DB.InventoryReport.findAll({
        where: { reportType: 'renford' }
    }).then(function(reports) {

        return res.send({
            success: true,
            data: reports
        })

    }).catch(function(error) { API_ERROR_HANDLER(error, req, res, next) });

})

module.exports = router;
