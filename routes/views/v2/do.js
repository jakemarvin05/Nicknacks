const express = require('express');
const router = express.Router();
const path = require('path');

const debug = require('debug')('nn:views:do')
debug.log = console.log.bind(console)

const removeWrapped = require('../../../apps/utils/removeWrapped.js')

router.get('/:id', (req, res) => {

    let data = {}
    ASANA.tasks.findById(req.params.id).then(task => {

        if (!task) throw Error('Not found')

        debug(task)

        data.task = task

        return DB.TaskList.find({
            where: {
                asanaTaskDeliveryTicketID: req.params.id
            }
        })

    }).then(record => {

        if (!record) throw Error('Not found')

        debug(record)

        return DB.Transaction.find({
            where: {
                salesOrderNumber: record.salesOrderID
            }
        })

    }).then(transaction => {

        debug(transaction)

        data.transaction = transaction

        debug(data)

        debug(data.task.notes)

        data.notes = removeWrapped(data.task.notes, '[[', ']]')
        data.notes = data.notes.replace(/(\r\n|\n|\r)/gm, '<br>')

        return res.render('delivery-order', data)

    }).catch(err => {
        if (err.message === 'Not found') {
            return res.send(err)
        }
        ERROR_HANDLER(err)
    })

})
module.exports = router;
