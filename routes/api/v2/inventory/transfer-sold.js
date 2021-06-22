'use strict'

const express = require('express')
const router = express.Router()
const permit = require(__appsDir + '/passport/permit')('/api/v2/inventory/transfer-sold')
const debug = require('debug')('nn:api:inventory:transfer-sold')
debug.log = console.log.bind(console)
const _ = require('lodash')

const createInventoryRecord = require(__appsDir + '/inventory/createInventoryRecord')

let inventoryIncludes = [{

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

}]

router.put('/', permit('/', 7), (req, res, next) => {

    debug('Starting transfer process.')
    debug(req.body)

    if (
        !req.body.salesOrderNumber ||
        !req.body.soldInventoryID ||
        !req.body.inventoryID ||
        !req.body.currentStorageLocationID ||
        !req.body.transferToStorageLocationID ||
        !req.body.quantity
    ) {
        let error = new Error('Inputs are not correct.')
        error.status = 400
        error.debug = req.body
    }

    Promise.resolve().then(() => {

        let transaction = DB.Transaction.findOne({
            where: {
                salesOrderNumber: req.body.salesOrderNumber
            }
        })

        let soldInventory = DB.SoldInventory.findOne({
            where: {
                SoldInventoryID: req.body.soldInventoryID
            }
        })

        let inventory = DB.Inventory.findOne({
            where: {
                InventoryID: req.body.inventoryID
            },
            include: inventoryIncludes
        })

        let storageLocationFrom = DB.StorageLocation.findOne({
            where: {
                StorageLocationID: req.body.currentStorageLocationID
            }
        })

        let storageLocationTo = DB.StorageLocation.findOne({
            where: {
                StorageLocationID: req.body.transferToStorageLocationID
            }
        })

        let inventory_storage = DB.Inventory_Storage.findOne({
            where: {
                Inventory_inventoryID: req.body.inventoryID,
                StorageLocation_storageLocationID: req.body.currentStorageLocationID
            }
        })

        return [
            transaction,
            soldInventory,
            inventory,
            storageLocationFrom,
            storageLocationTo,
            inventory_storage
        ]
    }).spread((
        transaction,
        soldInventory,
        inventory,
        storageLocationFrom,
        storageLocationTo,
        inventory_storage
    ) => {

        if (!transaction ||
            !soldInventory ||
            !inventory ||
            !storageLocationFrom ||
            !storageLocationTo ||
            !inventory_storage
        ) {
            let items = [
                ['transaction', transaction],
                ['soldInventory', soldInventory],
                ['inventory', inventory],
                ['storageLocationFrom', storageLocationFrom],
                ['storageLocationTo', storageLocationTo],
                ['inventory_storage', inventory_storage]
            ]

            for (let i = 0; i < items.length; i++) {
                debug(items[i][0])
                debug(items[i][1])
            }

            throw Error('Data check failed, please refresh your browser.')
        }

        return DB.sequelize.transaction(function(t) {

            return PROMISE.resolve().then(() => {

                let promises = []

                // transfer the inventory first.

                // somehow StorageLocationID is in string. Convert req.body's IDs to string.
                req.body.currentStorageLocationID = (typeof req.body.currentStorageLocationID === 'string') ? req.body.currentStorageLocationID : req.body.currentStorageLocationID.toString()
                req.body.transferToStorageLocationID = (typeof req.body.transferToStorageLocationID === 'string') ? req.body.transferToStorageLocationID : req.body.transferToStorageLocationID.toString()

                let transferOut = _.find(inventory.StorageLocations, { StorageLocationID: req.body.currentStorageLocationID })
                let transferIn = _.find(inventory.StorageLocations, { StorageLocationID: req.body.transferToStorageLocationID })

                debug('Storage Locations')
                debug(inventory.StorageLocations)

                debug('transferOut')
                debug(transferOut)

                debug('transferIn')
                debug(transferIn)

                if (transferIn) {
                    debug('Inventory already has existing qty in receiving storage (to be transferred into.)')
                    debug('Updating inventory quantity to the storage location.')
                    transferIn.Inventory_Storage.quantity = parseInt(transferIn.Inventory_Storage.quantity) + parseInt(req.body.quantity)
                    promises.push( transferIn.Inventory_Storage.save({ transaction: t }) )
                } else {
                    debug('Inventory does not pre-exist in receiving storage (to be transferred into.)')
                    debug('Creating inventory quantity to the storage location.')
                    let create = DB.Inventory_Storage.create({
                        StorageLocation_storageLocationID: req.body.transferToStorageLocationID,
                        Inventory_inventoryID: inventory.InventoryID,
                        quantity: req.body.quantity
                    }, { transaction: t })
                    promises.push(create)
                }

                transferOut.Inventory_Storage.quantity = parseInt(transferOut.Inventory_Storage.quantity) - parseInt(req.body.quantity)
                if (!transferOut) throw Error('Data check failed, please refresh your browser. (`transferOut` is falsey.)')
                promises.push( transferOut.Inventory_Storage.save({ transaction: t }) )

                let record = {
                    inventory: inventory,
                    transfer: [{
                        StorageLocationID: storageLocationFrom.StorageLocationID,
                        name: storageLocationFrom.name,
                        transfer: -req.body.quantity
                    }, {
                        StorageLocationID: storageLocationTo.StorageLocationID,
                        name: storageLocationTo.name,
                        transfer: req.body.quantity
                    }]
                }
                debug('Inventory record:')
                debug(record)

                promises.push( createInventoryRecord(t, 'quickInventoryTransfer', record, req.user) )

                return promises

            }).spread(transferIn => {
                debug(`Transfering the sold inventory\'s location from ${soldInventory.Inventory_Storage_inventory_StorageID} to ${transferIn.Inventory_StorageID}` )
                soldInventory.Inventory_Storage_inventory_StorageID = transferIn.Inventory_StorageID
                return soldInventory.save({ transaction: t })
            })
        })

    }).then(() => {

        // retrieve the full model
        return DB.Transaction.findOne({
            where: {
                salesOrderNumber: req.body.salesOrderNumber
            },
            order: [ ['TransactionID', 'DESC'], [ DB.Inventory_Storage, DB.SoldInventory, 'SoldInventoryID', 'ASC' ] ],
            include: [{
                model: DB.Inventory_Storage,
                through: {
                    model: DB.SoldInventory,
                    attributes: [
                        'SoldInventoryID',
                        'Transaction_transactionID',
                        'Inventory_inventoryID',
                        'StorageLocation_storageLocationID',
                        'quantity'
                    ]
                },
                include: [{
                    model: DB.StorageLocation,
                    attributes: [
                        'StorageLocationID',
                        'name'
                    ]
                }, {
                    model: DB.Inventory,
                    attributes: [
                        'InventoryID',
                        'name',
                        'cogs',
                        'sku'
                    ]
                }]
            }]
        }).then(function(transaction) {
            res.send({
                success: true,
                data: transaction
            })
        })
    }).catch(function(error) { API_ERROR_HANDLER(error, req, res, next) })

})


module.exports = router
