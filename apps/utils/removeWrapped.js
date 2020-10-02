'use strict'

const debug = require('debug')('nn:utils:removeWrapped')
debug.log = console.log.bind(console)

function removeWrapped(str, start, end) {

    let startPos = str.indexOf(start)

    if (startPos === -1) {
        debug('Final string: ')
        debug(str)
        return str
    }

    debug(str)

    let endPos = str.indexOf(end, startPos)

    if (endPos === -1) endPos = str.length-1

    let newStr = str.substring(0,startPos)
    newStr += str.substring(endPos + end.length)

    debug(newStr)

    return removeWrapped(newStr, start, end)
}

module.exports = removeWrapped
