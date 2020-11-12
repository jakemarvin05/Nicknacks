const express = require('express');
const router = express.Router();
const path = require('path');

const debug = require('debug')('nn:views:do')
debug.log = console.log.bind(console)

const removeWrapped = require('../../../apps/utils/removeWrapped.js')
const getAddressFromTaskName = require('../../../apps/utils/delivery-order/getAddressFromTaskName.js')

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

        while (data.notes.indexOf('<br>') === 0) {
            data.notes = data.notes.substring(4, data.notes.length)
        }

        data.address = getAddressFromTaskName(data.task.name)

        data.deliveryDate = MOMENT(parseInt(data.transaction.deliveryDate)).format('Do MMMM YYYY, dddd')

        return res.render('delivery-order', data)

    }).catch(err => {
        if (err.message === 'Not found') {
            return res.send(err)
        }
        API_ERROR_HANDLER(err)
    })

})
module.exports = router;
