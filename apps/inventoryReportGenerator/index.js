'use strict'

const debug = require('debug')('nn:apps:inventoryReportGenerator')
debug.log = console.log.bind(console)

const fullReport = require('./fullReport')
const renfordReport = require('./renfordReport')

function inventoryReportGenerator() {

    fullReport()
    renfordReport()

}

module.exports = inventoryReportGenerator
