const moment = require('moment')
const path = require('path')
const fs = require('fs')

const ph = require('./readData.js')
ph.refresh()
const updateIfRequired = require('./updateIfRequired.js')
updateIfRequired(ph.data)

const checkIfPH = require('./checkIfPH.js')

const defaults = {
    leadWorkingDays: 1+2, // 1 day for trucking, 2 days for in-processing
    countSaturdaysAs: 0.5,
    countSundaysAs: 0,
}

const readyBy = (date, leadWorkingDays = defaults.leadWorkingDays) => {
    date = moment.unix(date/1000)
    if (!date.isValid()) return false
    let calendarDaysLater = 0
    let accumulate = 0

    for (; accumulate < leadWorkingDays; ) {
        let day = date.day()

        // sunday
        if (day === 0) {
            date.add(1, 'days')
            continue
        }

        // if other days, check if is PH
        if (checkIfPH(date, ph.data)) {
            date.add(1, 'days')
        } else if (day === 6) {
            date.add(1, 'days')
            accumulate += 0.5
        } else {
            date.add(1, 'days')
            accumulate += 1
        }
    }
    return date.unix() * 1000
}
module.exports = readyBy
