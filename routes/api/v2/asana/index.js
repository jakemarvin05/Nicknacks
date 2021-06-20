'use strict'

const express = require('express')
const router = express.Router()
const permit = require(__appsDir + '/passport/permit')('/api/v2/asana')
const debug = require('debug')('nn:api:asana')
debug.log = console.log.bind(console)

router.get('/task-url/:salesOrderNumber', permit('/task-url', 1), (req, res, next) => {

    return DB.TaskList.find({
        where: { salesOrderID: req.params.salesOrderNumber }
    }).then(dbTask => {
        return res.send({
            success: true,
            data: dbTask
        })
    }).catch(err => { API_ERROR_HANDLER(err, req, res, next) })

})


module.exports = router
