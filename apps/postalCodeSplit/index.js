'use strict'

const morning = [9,10,11,12,13,14,26,27,28,58,59,60,61,62,63,64,65,66,67,68,69,70,71]

// afternoon slot is simply those that are not in morning.

function postalCodeSplit(address) {
    if (!address || address.length === 0) return false
    return categorise( extractPostalCode(address) )
}

function extractPostalCode(address) {
    return address.match(/\d{6}/) ? address.match(/\d{6}/)[0] : false
}

function categorise(postalCode) {
    if (!postalCode) return false
    postalCode = postalCode.toString()

    // if something is wrong with the postal code
    if (postalCode.length !== 6) return false

    let areaCode = postalCode.substring(0, 2)

    areaCode = parseInt(areaCode)

    if (morning.indexOf(areaCode) === -1) return { code: postalCode, zone: 'East' }

    return { code: postalCode, zone: 'West' }
}

module.exports = postalCodeSplit
