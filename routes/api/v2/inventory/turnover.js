'use strict'

const express = require('express')
const router = express.Router()
const permit = require(__appsDir + '/passport/permit')('/api/v2/inventory/turnover')
const debug = require('debug')('nn:api:inventory:turnover')
debug.log = console.log.bind(console)
const _ = require('lodash')
const Not = require('you-are-not')
const not = Not.create({ willThrowError: false })
const moment = require('moment')

const availableMethods = [
    'ma',
]

router.get('/all', permit('/all', 7), (req, res, next) => {

    debug('Req query:')
    debug(req.query)

    // default inventory method, 30 days moving average
    let method = req.query.method ? req.query.method : 'ma'
    let interval = req.query.interval ? parseFloat(req.query.interval) : 30 // in days

    if (availableMethods.indexOf(method) < 0) {
        let error = Error(`Method not valid. Received: ${method}.`)
        error.status = 400
        error.level = 'low'
        error.sendEmail = false
        throw error
    }

    if ( not('number', interval) ) {
        let error = Error(`Interval not valid. Received: ${interval}.`)
        error.status = 400
        error.level = 'low'
        error.sendEmail = false
        throw error
    }

    let today = moment()
    let startFrom = moment().subtract(interval, 'days')
    let endAt = today

    let where = { notActive: { $not: true} }

    if (req.query.mto === 'true') {
        where.sku = {
            $like: '%-MTO'
        }
    } else if (req.query.mto === 'false') {
        where.sku = {
            $notLike: '%-MTO'
        }
    }

    Promise.resolve().then(() => {
        let inventories = DB.Inventory.findAll({
            where,
            attributes: [
                'InventoryID',
                'name',
                'sku',
            ]
        })
        let movements = DB.InventoryMovement.findAll({
            where: {
                source: 'delivery',

                $or: {

                    sourceData: {
                        deliveryDate: {
                            $and: {
                                $gt: (startFrom.unix()*1000).toString(),
                                $lt: (endAt.unix()*1000).toString(),
                            },
                        },
                    },

                    $and: {
                        // some self collects have no delivery dates. so we use createdAt as proxy.
                        sourceData: {
                            deliveryDate: null
                        },
                        createdAt: {
                            $and: {
                                $gt: startFrom,
                                $lt: endAt,
                            },
                        },
                    },

                }
            },
            attributes: [
                'InventoryMovementID',
                'sourceData',
                'involvedProductIDs'
            ]
        })

        return [ inventories, movements ]
    }).spread( (inventories, movements) => {
        //debug(inventories)
        //debug(movements)

        let newInventories = []
        inventories.forEach(inventory => {
            let InventoryID = inventory.InventoryID

            let inventoryObj = {
                InventoryID,
                name: inventory.name,
                sku: inventory.sku,
                quantity: 0
            }

            movements.forEach(movement => {
                if ( movement.involvedProductIDs.indexOf( parseInt(InventoryID) )) {

                    let soldInventories = D.get(movement, 'sourceData.soldInventories')

                    if (not('array', soldInventories)) {
                        debug(`soldInventories prop for ${movement.InventoryMovementID} is not array.`)
                        return
                    }

                    let found = soldInventories.find(el => parseInt(el.InventoryID) === parseInt(InventoryID))
                    //debug(found)
                    if (found && found.quantity && !isNaN(found.quantity)) inventoryObj.quantity += parseInt(found.quantity)
                }
            })

            newInventories.push(inventoryObj)
        })

        //debug(newInventories)

        res.send({
            success: true,
            data: newInventories,
        })

    }).catch(function(error) { API_ERROR_HANDLER(error, req, res, next) })

})


module.exports = router
