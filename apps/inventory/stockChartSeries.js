'use strict'

const _ = require('lodash')

function stockChartSeries(inventory, movementRecords) {

    let series = []
    let changeSeries = {
        name: 'Change',
        type: 'column',
        data: []
    }
    let unscheduledDeliveryCount = 0

    // past events (movement records)
    if (movementRecords && movementRecords.length > 0) {


        // each sold inventories is grouped by storageLocation
        movementRecords.forEach(record => {

            let serial = {
                y: 0,
                x: 0
            }

            if (record.source === 'shipment') {

                serial.x = parseInt(record.sourceData.actualArrival)

                record.sourceData.data.inventorised.forEach(shipmentProduct => {

                    if ( parseInt(shipmentProduct.InventoryID) === parseInt(inventory.InventoryID) ) {
                        serial.y += parseInt(shipmentProduct.quantity)
                    }

                })

            } else if (record.source === 'discrepancy') {
                serial.x = MOMENT(record.createdAt).unix() * 1000

                record.sourceData.adjustments.forEach(adjust => {
                    serial.y += parseInt(adjust.adjustment)
                })

            } else if (record.source === 'delivery') {
                serial.x = parseInt(record.sourceData.deliveryDate) ? parseInt(record.sourceData.deliveryDate) : MOMENT(record.createdAt).unix() * 1000

                record.sourceData.soldInventories.forEach(soldInventory => {
                    if (parseInt(soldInventory.InventoryID) === parseInt(inventory.InventoryID)) {
                        serial.y -= parseInt(soldInventory.quantity)
                    }
                })
            }

            if (serial.x !== 0 || serial.y !== 0) changeSeries.data.push(serial)


        })
    }

    // sold inventory
    if (inventory.soldInventories && inventory.soldInventories.length > 0) {

        // each sold inventories is grouped by storageLocation
        inventory.soldInventories.forEach(storageLocation => {
            storageLocation.Transactions.forEach(txn => {

                // no date, set to 9999999999999 so that it will appear last
                let date = txn.deliveryDate
                if (!txn.deliveryDate) {
                    unscheduledDeliveryCount += txn.SoldInventory.quantity
                } else {
                    changeSeries.data.push({
                        x: parseInt(date),
                        y: -parseInt(txn.SoldInventory.quantity)
                    })
                }

            })
        })
    }

    // transit inventory
    if (inventory.TransitInventories && inventory.TransitInventories.length > 0) {

        inventory.TransitInventories.forEach(transit => {

            changeSeries.data.push({
                x: parseInt(transit.Shipment.expectedArrival),
                y: parseInt(transit.quantity)
            })
        })
    }

    // sort by date to have the earliest first.
    // then if date clash, sort to have the transit be first. since t > s => 'desc'
    //let ordered = _.orderBy(timeline, ['date', 'type'], ['asc', 'desc'])

    changeSeries.data = _.sortBy(changeSeries.data, 'x')
    series.push(changeSeries)

    // STOCK SERIES

    // find our spot in the changeSeries timeline. start from the rear as we have less events in front.
    let indexOfLatestEvent = 0
    let now = new Date().getTime()
    for (let i=changeSeries.data.length-1; i>-1; i--) {
        if (changeSeries.data[i].x < now) {
            indexOfLatestEvent = i
            break
        }
    }

    let stockSeries = {
        name: "Stock",
        type: 'line',
        data: []
    }

    // adjusting the inventory with every past event starting from the most recent
    for (let i=indexOfLatestEvent; i>-1; i--) {
        let serial = {
            x: changeSeries.data[i].x
        }
        if (i === indexOfLatestEvent) {
            // the current stock is reflected by the very last event that happened.
            // so the time of the last event, reflects the current stock count.
            serial.y = _.sumBy(inventory.StorageLocations, s => {
                return parseInt(s.Inventory_Storage.quantity)
            })
        } else {
            serial.y = stockSeries.data[0].y - changeSeries.data[i+1].y // because we use unshift to insert the stockSeries, the next serial is always calculated based on position 0
        }
        stockSeries.data.unshift(serial)
    }

    // adjusting the inventory with future events starting from the nearest one
    for (let i=indexOfLatestEvent+1; i<changeSeries.data.length; i++) {

        let serial = {
            x: changeSeries.data[i].x,
            y: stockSeries.data[stockSeries.data.length-1].y + changeSeries.data[i].y // we calculate the next serial based on the last serial of the current array.
        }
        stockSeries.data.push(serial)
    }

    console.log(stockSeries)
    console.log(changeSeries)

    series.push(stockSeries)


    return {
        series: series,
        unscheduledDeliveryCount: unscheduledDeliveryCount
    }

}
module.exports = stockChartSeries
