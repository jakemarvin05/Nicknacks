'use strict';

const debug = require('debug')('nn:apps:asanaBot:updateTask')
debug.log = console.log.bind(console)

const makeIDObject = require('./makeIDObject.js')
const _ = require('lodash')
const prepareComments = require('./prepareComments')
const config = require('./config.js')
const sectionShift = require('./sectionShift.js')
const tagChange = require('./tagChange.js')

function updateTask(fromMagento, options) {

    let obj = {}
    obj.ID = makeIDObject(fromMagento.order_id)

    debug('Initiating process for: ' + obj.ID.withoutHex)

    var _TASK_ID, _DB_TASK, _COMMENT

    // first time if the task exist on DB
    return DB.TaskList.find({
        where: { salesOrderID: obj.ID.default }
    }).then(dbTask => {

        if (!dbTask) {
            let error = new Error('Task on DB not found. Please make sure `Order` webhook is working and resend it.')
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
        debug(obj.ID.withoutHex + ': Creating comment and updating task')
        let comment = prepareComments(fromMagento)
        _COMMENT = comment
        debug(comment)

        // update task with comment
        let taskComment = ASANA.tasks.addComment(task.gid, {
            html_text: comment
        })
        promises.push(taskComment)

        /* TASK UPDATES AND SECTION SHIFTING */

        // NOTE: ONLY ORDER COMMENT, DELIVERY ORDER, or DELIVERY ORDER COMMENT updates due date (delivery date)
        if (['ordercomment', 'shipment', 'shipmentcomment'].indexOf(fromMagento.type.toLowerCase()) !== -1) {

            // sort on whether there is a scheduled date and time
            // so that we can shift the tasks into the right sections
            let taskUpdatePayload = {}

            // if delivery date exist, check if time exists
            if (fromMagento.data.delivery_date) {

                let deliveryDate = MOMENT.unix(fromMagento.data.delivery_date).format('YYYY-MM-DD')

                // if delivery time exist
                if (fromMagento.data.delivery_time) {
                    // make the full moment object

                    // extract the start time first
                    // the magento data looks something like this "Weekday Afternoon 02:00 PM - 05:00 PM"
                    let deliveryStartTime = fromMagento.data.delivery_time.substring(fromMagento.data.delivery_time.indexOf(':') - 2, fromMagento.data.delivery_time.indexOf(':') + 6)
                    let momentTime = MOMENT(deliveryDate + ' ' + deliveryStartTime + ' +0800', 'YYYY-MM-DD HH:mm A Z')

                    taskUpdatePayload.due_at = momentTime.format()
                } else {
                    // if delivery time don't exist, just put date
                    taskUpdatePayload.due_on = deliveryDate
                }
            } else {
                // delivery date does not exist, remove task due date
                taskUpdatePayload.due_on = null
                taskUpdatePayload.due_at = null
            }

            // SHIFTING BETWEEN SECTIONS AND TAGGING
            if (fromMagento.type.toLowerCase() === 'ordercomment') {

                // if there is deliveryDate in sales order
                // we take it that delivery is scheduled ONLY if it also includes TIME

                // hence if there is no time
                if (!taskUpdatePayload.due_at) {

                    // tag it to no delivery date and time
                    let tagging = tagChange(task, config.tags.noDeliveryDateAndTime)
                    if (tagging.length > 0) promises.concat(tagging)

                    // shift it to no delivery date and time
                    let shift = sectionShift(task, config.projects.main.sections.noDeliveryDateAndTime)
                    if (shift) promises.push(shift)

                } else {

                    //Have Date, Not Confirmed
                    let tagging = tagChange(task, config.tags.haveDateButNotConfirmed)
                    if (tagging.length > 0) promises.concat(tagging)

                    // shift it to have date, not confirmed
                    let shift = sectionShift(task, config.projects.main.sections.haveDateButNotConfirmed)
                    if (shift) promises.push(shift)

                }
            } else if (['shipment', 'shipmentcomment'].indexOf(fromMagento.type.toLowerCase()) !== -1) {

                if (taskUpdatePayload.due_at) {

                    //confirmed tagging
                    let tagging = tagChange(task, config.tags.deliveryConfirmed)
                    if (tagging.length > 0) promises.concat(tagging)

                    //confirmed section shift
                    let shift = sectionShift(task, config.projects.main.sections.deliveryConfirmed)
                    if (shift) promises.push(shift)

                } else {

                    //tag it to unconfirmed, no delivery date and time
                    let tagging = tagChange(task, config.tags.noDeliveryDateAndTime)
                    if (tagging.length > 0) promises.concat(tagging)

                    //confirmed section shift
                    let shift = sectionShift(task, config.projects.main.sections.noDeliveryDateAndTime)
                    if (shift) promises.push(shift)
                }

            }

            // now we will update the due dates accordingly
            promises.push( ASANA.tasks.update(_DB_TASK.asanaTaskID, taskUpdatePayload) )
            promises.push( ASANA.tasks.update(_DB_TASK.asanaTaskDeliveryTicketID, taskUpdatePayload) )

            //and also just apply the followers
            let followersUpdate = ASANA.teams.users(config.teams.gns).then(team => {
                let gnsTeamMembers = []
                for (let i=0; i<team.data.length; i++) {
                    gnsTeamMembers.push(team.data[i].gid)
                }

                PROMISE.all([
                    ASANA.tasks.addFollowers(_DB_TASK.asanaTaskID, { followers: gnsTeamMembers }),
                    ASANA.tasks.addFollowers(_DB_TASK.asanaTaskDeliveryTicketID, { followers: gnsTeamMembers })
                ])

            })

            promises.push(followersUpdate)

            // AUTOMATIC ASSIGNMENT TO DELIVERY PARTNERS
            // AS WELL AS DELIVERY TICKET COMMENT UPDATES
            if (['shipment', 'shipmentcomment'].indexOf(fromMagento.type.toLowerCase()) !== -1) {

                // update task with comment
                let ticketComment = ASANA.tasks.addComment(_DB_TASK.asanaTaskDeliveryTicketID, {
                    html_text: _COMMENT
                })
                promises.push(ticketComment)

                // AUTO ASSIGNMENT
                let isRenford = false

                if(Array.isArray(fromMagento.trackinginfo) && fromMagento.trackinginfo.length > 0 ) {
                    for(let i=0; i<fromMagento.trackinginfo.length; i++) {
                        let tracking = fromMagento.trackinginfo[i]
                        if (tracking.title.toLowerCase() === 'renford') isRenford = true
                        // let title = tracking.title + ' (' + tracking.number + ')'
                    }
                }

                if (isRenford) {
                    promises.push(
                        ASANA.tasks.addProject(_DB_TASK.asanaTaskDeliveryTicketID, {
                            project: config.projects.renfordDelivery.id
                        })
                    )
                } else {
                    promises.push(
                        ASANA.tasks.removeProject(_DB_TASK.asanaTaskDeliveryTicketID, {
                            project: config.projects.renfordDelivery.id
                        })
                    )
                }

            }


        }
        return promises
    })
}

module.exports = updateTask;
