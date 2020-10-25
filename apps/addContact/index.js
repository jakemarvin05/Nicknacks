'use strict'

const axios = require('axios')
const debug = require('debug')('nn:apps:addContact:index.js')
debug.log = console.log.bind(console)

const api = `${process.env.CONTACT_BOT_URL}/api/v1/add-contact`

function add(data) {
    axios.post(api, data).catch(err => {
        err.sendEmail = false
        err.debug = {
            data: data,
            message: 'Failed to add contact'
        }
        API_ERROR_HANDLER(err)
    })
}

module.exports = add
