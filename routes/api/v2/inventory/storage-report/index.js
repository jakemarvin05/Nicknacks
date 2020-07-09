'use strict'
const express = require('express')
const router = express.Router()
const permit = require(__appsDir + '/passport/permit')('/api/v2/inventory/storage-report')
const debug = require('debug')('nn:api:inventory')
debug.log = console.log.bind(console)

router.get('/all', permit('/all', 1), function(req, res, next) {

    debug(req.body);

    return DB.InventoryReport.findAll({
        where: { reportType: 'full' }
    }).then(function(reports) {

        return res.send({
            success: true,
            data: reports
        })

    }).catch(function(error) { API_ERROR_HANDLER(error, req, res, next) });

})

router.get('/report-dates', permit('/report-dates', 1), function(req, res, next) {

    debug(req.body)

    return DB.InventoryReport.findAll({
        where: { reportType: 'full' },
        attributes: ['createdAt']
    }).then(function(reportsDates) {

        return res.send({
            success: true,
            data: reportsDates
        })

    }).catch(function(error) { API_ERROR_HANDLER(error, req, res, next) });

})

router.get('/by-date', permit('/by-date', 1), function(req, res, next) {

    debug(req.query)

    return DB.InventoryReport.find({
        where: {
            reportType: 'full',
            createdAt: req.query.createdAt
        }
    }).then(function(report) {

        return res.send({
            success: true,
            data: report
        })

    }).catch(function(error) { API_ERROR_HANDLER(error, req, res, next) });

})

module.exports = router;
