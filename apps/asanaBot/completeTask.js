'use strict';

const debug = require('debug')('nn:apps:asanaBot:completeTask')
debug.log = console.log.bind(console)

const config = require('./config.js')

function completeTask(data) {

    let salesOrderID = data.sourceData.details.salesOrderNumber
    let soldInventories = data.sourceData.soldInventories

    var _TASK_ID, _DB_TASK, _COMMENT

    // first time if the task exist on DB
    return DB.TaskList.find({
        where: { salesOrderID: salesOrderID }
    }).then(dbTask => {

        if (!dbTask) {
            let error = new Error('Task not found in DB. Please make sure magento `Order` webhook is working and resend it.')
            error.status = 400
            throw error
        }

        _TASK_ID = parseInt(dbTask.asanaTaskID)
        _DB_TASK = dbTask

        return ASANA.tasks.findById(_TASK_ID).catch(error => {

            //if no task is found, return the task object as stored in our local DB
            if (error.status === 404) {
                let error = new Error('Asana task not found. Please make sure `Order` webhook is working and task exists on Wunderlist App.')
                error.status = 500
                throw error
            } else {
                // for whatever other errors we face, we throw the error
                throw error
            }
        })

    }).then(task => {

        let promises = []

        // it exists on DB and on task programme, create the comment.
        debug(salesOrderID + ': Creating comment and completing task')

        let comment = "Delivered:\n"

        soldInventories.forEach(inventory => {
            comment += "\n"
            comment += `${inventory.quantity} x ${inventory.sku} from ${inventory.StorageLocationName}`
        })

        _COMMENT = `<body>${comment}</body>`
        debug(_COMMENT)

        // update task with comment
        let taskComment = ASANA.tasks.addComment(task.gid, {
            html_text: _COMMENT
        })
        promises.push(taskComment)

        let completeTask = ASANA.tasks.update(task.gid, {
            completed: true
        })
        promises.push(completeTask)

        return promises
    })
}

module.exports = completeTask
