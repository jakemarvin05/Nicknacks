'use strict';

const debug = require('debug')('nn:apps:asanaBot:updateTask')
debug.log = console.log.bind(console)

const makeIDObject = require('./makeIDObject.js')
const _ = require('lodash')
const prepareComments = require('./prepareComments')
const config = require('./config.js')

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
                }
            } else {
                // delivery date does not exist, remove task due date
                // this may not work, i need to check it
                taskUpdatePayload.due_on = null
                taskUpdatePayload.due_at = null
            }

            // SHIFTING BETWEEN SECTIONS
            if (fromMagento.type.toLowerCase() === 'ordercomment') {

                // if there is deliveryDate in sales order
                // we take it that delivery is scheduled ONLY if it also includes TIME
                if (taskUpdatePayload.due_at) {
                    // shift it to have date
                    let sectionShift = ASANA.sections.addTask(
                        config.projects.main.sections.haveDateButNotConfirmed, {
                            task: task.gid
                        }
                    )
                    promises.push(sectionShift)
                } else {
                    let sectionShift = ASANA.sections.addTask(
                        config.projects.main.sections.noDeliveryDate, {
                            task: task.gid
                        }
                    )
                    promises.push(sectionShift)
                }
            } else if (['shipment', 'shipmentcomment'].indexOf(fromMagento.type.toLowerCase()) !== -1) {
                if (taskUpdatePayload.due_at) {
                    // if there is delivery date and time in delivery order
                    let sectionShift = ASANA.sections.addTask(
                        config.projects.main.sections.deliveryConfirmed, {
                            task: task.gid
                        }
                    )
                    promises.push(sectionShift)

                } else {

                    let sectionShift = ASANA.sections.addTask(
                        config.projects.main.sections.noDeliveryDate, {
                            task: task.gid
                        }
                    )
                    promises.push(sectionShift)
                }

            }

            // now we will update the due dates accordingly, and also just apply the followers
            let GNS_TEAM_MEMBERS = []

            let taskUpdates = PROMISE.resolve().then(() => {

                return [
                    ASANA.tasks.update(task.gid, taskUpdatePayload),
                    ASANA.tasks.update(_DB_TASK.asanaTaskDeliveryTicketID, taskUpdatePayload),
                    ASANA.teams.users(config.teams.gns).then(team => {
                        for (let i=0; i<team.data.length; i++) {
                            GNS_TEAM_MEMBERS.push(team.data[i].gid)
                        }
                        return false
                    })
                ]
            }).spread((task, deliveryTicket, _) => {

                // carpet bombing manner of adding followers.
                let promises = [
                    ASANA.tasks.addFollowers(task.gid, { followers: GNS_TEAM_MEMBERS }),
                    ASANA.tasks.addFollowers(deliveryTicket.gid, { followers: GNS_TEAM_MEMBERS })
                ]

                // AUTOMATIC ASSIGNMENT TO DELIVERY PARTNERS
                // AS WELL AS DELIVERY TICKET COMMENT UPDATES
                if (['shipment', 'shipmentcomment'].indexOf(fromMagento.type.toLowerCase()) !== -1) {

                    // update task with comment
                    let ticketComment = ASANA.tasks.addComment(deliveryTicket.gid, {
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
                            ASANA.tasks.addProject(deliveryTicket.gid, {
                                project: config.projects.renfordDelivery.id
                            })
                        )
                    } else {
                        promises.push(
                            ASANA.tasks.removeProject(deliveryTicket.gid, {
                                project: config.projects.renfordDelivery.id
                            })
                        )
                    }

                }
                return promises
            })
            promises.concat(taskUpdates)

        }
        return promises
    })
}

module.exports = updateTask;
