'use strict'

function getAddressFromTaskName(name) {
    let i = name.indexOf(',')
    return name.substring(i+1, name.length).replace('(delivery ticket)', '')
}
module.exports = getAddressFromTaskName
