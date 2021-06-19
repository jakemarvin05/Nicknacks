const moment = require('moment')

const format = 'YYYY-MM-DD'

function checkIfPH(date, phData) {
    let year = date.year()
    let dateFormatted = date.format(format)
    let holidays = phData[year]

    // if there's no data for some reason, return false.
    if (!holidays) return false
    
    for (let i = 0; i < holidays.length; i ++) {

        let holiday = [
            holidays[i].Date,
            holidays[i].Observance
        ]

        for (let i = 0; i < holiday.length; i++) {
            if (dateFormatted === holiday[i]) return true
        }

    }
    return false
}

module.exports = checkIfPH
