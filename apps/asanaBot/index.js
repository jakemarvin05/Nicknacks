'use strict'
const debug = require('debug')('nn:apps:asanaBot')
debug.log = console.log.bind(console)


const createTask = require('./createTask.js')
const updateTask = require('./updateTask.js')

function taskBot(fromMagento, options) {

    debug(fromMagento)

    var type = fromMagento.type

    if(!type || typeof type !== 'string') {
        let error = new Error('Type of `type` is not a string.')
        error.status = 400
        throw error
    }
    type = type.toLowerCase()

    if (type === 'order') {
        // 1.  SALES ORDER
        return createTask(fromMagento, options)

    } else {
        return updateTask(fromMagento, options)

    }

}

module.exports = taskBot
