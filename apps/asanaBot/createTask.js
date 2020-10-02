'use strict';

const debug = require('debug')('nn:apps:asanaBot:createAsanaTask')
debug.log = console.log.bind(console)

const config = require('./config.js')

const makeIDObject = require('./makeIDObject.js')
const _ = require('lodash')
const postalCodeSplit = require('../postalCodeSplit/index.js')
const markDownToHTML = require('./markDownToHTML.js')

function createTask(fromMagento, options) {

    var TASK_DATA, DELIVERY_TICKET

    let obj = {}
    obj.ID = makeIDObject(fromMagento.increment_id)

    debug('Initiating process for: ' + obj.ID.withoutHex)

    return DB.TaskList.find({
        where: { salesOrderID: obj.ID.default }
    }, { transaction: D.get(options, 'transaction') }).then(function(task) {

        // the idea here is that Asana tasks may sometimes be deleted

        // Case 1: re-curl
        // the db record exists and asana task exist as well
        // this is just a re-curl which can be ignored.

        // Case 2: asana task deleted but db record is still intact
        // we want to delete away the db record and start everything afresh

        if (task) {
            // already created in DB, check in Asana
            return ASANA.tasks.findById(parseInt(task.asanaTaskID)).then(asanaTask => {
                // if task already exist, return false
                return false

            }).catch(error => {

                //if no task is found, return the task object as stored in our local DB
                if (error.status === 404) {
                    return task
                } else {
                    // for whatever other errors we face, we throw the error
                    throw error
                }
            })

        } else {
            return 'toCreateBrandNewEntries'
        }
    }).then(dbTask => {

        if (dbTask === false) {
            debug('Asana task already exist. Returning...')
            return false
        }

        // create task in asana.
        debug(obj.ID.withoutHex + ': Task doesn\'t exist, creating..')

        obj.name = fromMagento.data.customer_firstname + ' ' + fromMagento.data.customer_lastname
        obj.email = fromMagento.data.customer_email
        obj.phone = fromMagento.data.customer_telephone
        obj.dateOfOrder = MOMENT.unix(fromMagento.order_created_at).format('Do MMMM YYYY, h:mm:ss a')
        obj.paymentMethod = fromMagento.data.payment_method

        obj.address = (fromMagento.data.shipping_address.length > 0) ? fromMagento.data.shipping_address : fromMagento.data.billing_address
        if (fromMagento.data.delivery_date) {
            obj.deliveryDate = MOMENT.unix(fromMagento.data.delivery_date).format('YYYY-MM-DD')
            obj.deliveryDateFull = MOMENT.unix(fromMagento.data.delivery_date).format('Do MMMM YYYY, dddd')

            if (fromMagento.data.delivery_time) {
                // make the full moment object

                // extract the start time first
                // the magento data looks something like this "Weekday Afternoon 02:00 PM - 05:00 PM"
                let deliveryStartTime = fromMagento.data.delivery_time.substring(fromMagento.data.delivery_time.indexOf(':') - 2, fromMagento.data.delivery_time.indexOf(':') + 6)
                obj.momentTime = MOMENT(obj.deliveryDate + ' ' + deliveryStartTime + ' +0800', 'YYYY-MM-DD HH:mm A Z')

            }
        }
        obj.deliveryTime = fromMagento.data.delivery_time
        obj.deliveryComments = fromMagento.data.delivery_comments

        obj.items = (function(items) {
            let itemBody = '# Purchase'
            for(let i=0; i<items.length; i++) {
                let item = items[i]
                itemBody += '\n\n## ' + (i+1) + '. ' + item.name

                if (item.product_description && item.product_description.length > 0) {
                    itemBody += '\n(Description: ' + item.product_description + ')'
                }

                var optionKeys = []
                if (item.Options) optionKeys = Object.keys(item.Options)
                if (optionKeys.length > 0) {
                    for(let i=0; i<optionKeys.length; i++) {
                        let key = optionKeys[i]
                        let option = item.Options[key]
                        itemBody += '\n' + key + ': ' + option
                    }
                }

                itemBody += '\nSKU: ' + item.sku
                itemBody += '\nQty: ' + item['Ordered Qty']
                itemBody += '\nPrice: ' + item.Price
                itemBody += '\nSubtotal: ' + parseFloat(item['Ordered Qty']) * parseFloat(item.Price)
            }
            return itemBody
        })(fromMagento.items)

        obj.comments = (function(comments) {

            if (comments.length < 1) return ''

            let commentBody = '\n\n\n# Comment'
            for(let i=0; i<comments.length; i++) {
                let comment = comments[i]
                commentBody += '\n\n## ' + comment.created_at
                commentBody += '\n' + comment.comment
            }

            return commentBody

        })(fromMagento.order_comments)

        obj.totals = fromMagento.totals

        /* TITLE */

        let title = obj.ID.stub


        let icons = ' '

        if (obj.paymentMethod.toLowerCase().indexOf('bank transfer') === 0) icons += '💵'

        // for sofa, add logo
        let sofa = _.find(fromMagento.items, (item) => {
            if (typeof item.sku === 'string') {
                return item.sku.toLowerCase().indexOf('sofa') > -1
            }
        })
        if (sofa) icons += '🛋'

        let mila = _.find(fromMagento.items, (item) => {
            if (typeof item.sku === 'string') {
                return item.sku.toLowerCase().indexOf('mila') > -1
            }
        })
        if (mila) icons += '👕'

        if (icons.length > 1) title += icons

        let titleShort = title + ', ' + obj.name
        let postal = postalCodeSplit(obj.address)
        if (postal) titleShort = titleShort + ', ' + postal.code + ', ' + ((postal.zone === 'West') ? "👈" : "👉🏾")

        let titleLong = title
        if (obj.address && obj.address.length > 0) titleLong += ', ' + obj.address

        /* BODY */
        let body = obj.items


        body += '\n\n\n# ' + titleLong

        body += '\n\n\n# Info'
        body += '\nSales Order: ' + obj.ID.stub
        body += '\nName: ' + obj.name
        body += '\nEmail: ' + obj.email
        body += '\nPhone: ' + obj.phone
        body += '\nDate of order: ' + obj.dateOfOrder
        body += '\nMethod: ' + obj.paymentMethod

        // if there are comments
        if (obj.order_comment && obj.order_comment.length > 0) body += obj.order_comment

        // there can be non-deliverable products. So if have address will put
        if (obj.address && obj.address.length > 0) {
            body += '\n\n\n# Delivery'
            body += '\nAddress: ' + obj.address
            body += '\nDelivery date: ' + (obj.deliveryDateFull || 'Not indicated')
            body += '\nTime: ' + (obj.deliveryTime || 'Not indicated')
            if (obj.delivery_comments && obj.delivery_comments.length > 0) body += '\nComment: ' + obj.delivery_comments
        }

        body += '\n\n\n# Totals'
        body += '\n\n## Subtotals'
        body += '\nWithout tax: ' + obj.totals.subtotal
        body += '\nWith tax: ' + obj.totals.subtotal_incl_tax
        body += '\n\n## Shipment'
        body += '\nWithout tax: ' + obj.totals.shipping_amount
        body += '\nWith tax: ' + obj.totals.shipping_incl_tax
        body += '\n\n## Grand totals'
        body += '\nWithout tax: ' + obj.totals.grand_total
        body += '\nWith tax: ' +  obj.totals.grand_total_incl_tax

        body += obj.comments

        var taskObject = {
            projects: [config.projects.main.id],
            name: titleShort,
            notes: body,
            html_notes: markDownToHTML(body)
        }

        // if momentTime is defined, it means there is a delivery date and time arranged.
        // need to use the `due_at` attribute
        if (obj.momentTime) {
            taskObject.due_at = obj.momentTime.format()
            taskObject.tags = [ config.tags.haveDateButNotConfirmed ]
        } else if (obj.deliveryDate) {
            // otherwise maybe just the date is arranged.
            // need to use the `due_on` attribute
            taskObject.due_on = obj.deliveryDate
            taskObject.tags = [ config.tags.noDeliveryDateAndTime ]
        }


        // pust taskObject to wunderlist
        debug(JSON.stringify(taskObject))

        let GNS_TEAM_MEMBERS = []
        return ASANA.teams.users(config.teams.gns).then(team => {

            for (let i=0; i<team.data.length; i++) {
                GNS_TEAM_MEMBERS.push(team.data[i].gid)
            }

            taskObject.followers = GNS_TEAM_MEMBERS

            return ASANA.tasks.create(taskObject)

        }).then(taskData => {

            TASK_DATA = taskData

            let promises = []

            debug(obj.ID.withoutHex + ': Response in creating task:')
            debug(taskData)

            // with each task, always create a delivery ticket
            let deliveryTicketPayload = {
                name: '🚛 ' + titleLong + ' (delivery ticket)',
                html_notes: "<body>[[Please enclose text to be hidden from the DO in double square brackets.]]\n<strong>[[Picking list:]]</strong>\n\n(Fill in here)\n\n\n<strong>Other instructions:</strong>\n\n(Fill in here)</body>",
                followers: GNS_TEAM_MEMBERS
            }

            // due_at is more specific with date time
            if (taskData.due_at) {
                deliveryTicketPayload.due_at = taskData.due_at
            } else if (taskData.due_on) {
                // due on is only with date. Asana API stipulates should only use either.
                deliveryTicketPayload.due_on = taskData.due_on
            }

            let deliveryTicket = ASANA.tasks.addSubtask(taskData.gid, deliveryTicketPayload)

            promises.push(deliveryTicket)

            // create subtasks for bank transfer
            if (obj.paymentMethod.toLowerCase().indexOf('bank transfer') === 0) {
                debug('Bank transfer detected. Creating subtask...')
                let verifyBankTransferSubtask = ASANA.tasks.addSubtask(
                    taskData.gid, {
                        name: 'Verify bank transfer: ' + obj.totals.grand_total_incl_tax,
                        followers: GNS_TEAM_MEMBERS
                    }
                )
                promises.push(verifyBankTransferSubtask)
            } else { promises.push(false) }

            // assign the task to the appropriate section
            // if momentTime is not present, tasks will automatically go into the first section
            // momentTime is indication of both date and time arranged. just arranged for date
            // without time is not counted as "have date"
            if (obj.momentTime) {
                // if there is deliveryDate in sales order
                let sectionShift = ASANA.sections.addTask(
                    config.projects.main.sections.haveDateButNotConfirmed, {
                        task: taskData.gid
                    }
                )
                promises.push(sectionShift)
            }

            return promises

        }).spread((deliveryTicket, verifyBankTransferSubtask, sectionShift)=> {

            debug(obj.ID.withoutHex + ': Response in creating deliveryTicket:')
            debug(deliveryTicket)

            DELIVERY_TICKET = deliveryTicket

            debug(DELIVERY_TICKET)


            if(verifyBankTransferSubtask) {
                debug(obj.ID.withoutHex + ': Response creating bank transfer subtask:')
                debug(verifyBankTransferSubtask)
            }

            // make the DB entry
            debug(obj.ID.withoutHex + ': Adding entry to own db.');

            if (!TASK_DATA) {
                let error = new Error('`TASK_DATA` is empty.')
                error.status = 500
                throw error
            }

            if (!DELIVERY_TICKET) {
                let error = new Error('`DELIVERY_TICKET` is empty.')
                error.status = 500
                throw error
            }

            //dbTask is an object if the task exists in DB but was deleted off Asana
            // so we delete the db record and start anew.
            if (typeof dbTask !== 'string') {
                return dbTask.destroy()
            } else { return false }

        }).then(() => {

            debug('Adding delivery ticket comment:')
            // make the DO link
            let doLink = process.env.DOMAIN + '/views/v2/do/' + DELIVERY_TICKET.gid
            debug(doLink)
            return ASANA.tasks.addComment(DELIVERY_TICKET.gid, {
                text: `See DO: ${doLink}`
            })

        }).then(() => {

            return DB.TaskList.create({
                asanaTaskID: TASK_DATA.gid,
                asanaTaskDeliveryTicketID: DELIVERY_TICKET.gid,
                salesOrderID: parseInt(obj.ID.default)
            }, { transaction: D.get(options, 'transaction') }).then((listTask) => {

                let debugString = obj.ID.withoutHex
                debugString += ': Entry added successfully. asanaTaskID: '
                debugString += listTask.asanaTaskID
                debugString += ' deliveryTicketID: '
                debugString += listTask.asanaTaskDeliveryTicketID
                debugString += ' SalesOrderID: '
                debugString += listTask.salesOrderID

                debug(debugString)

                return listTask

            }).catch(function(err) {
                console.log('CRITICAL: ' + obj.ID.stub + ' adding to db errored! Error is: ' + JSON.stringify(err));
                throw err
            })


        })

    })

}
module.exports = createTask;
