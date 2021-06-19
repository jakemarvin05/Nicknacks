const axios = require('axios')
const fs = require('fs')
const path = require('path')
const readData = require('./readData.js')

const phURL = (year) => `https://rjchow.github.io/singapore_public_holidays/api/${year}/data.json`
const getHolidays = (year) => {
    axios.get( phURL(year) ).then(data => {
        fs.writeFileSync(
            path.join(__dirname, 'data', `${year.toString()}.json`),
            JSON.stringify(data.data),
            'utf8'
        )
        readData.refresh()
    }).catch(error => {
        error.sendEmail = false
        error.level = 'low'
        API_ERROR_HANDLER(error)
    })
}

function updateIfRequired(data, currentYear = (new Date()).getFullYear()) {
    if (Object.keys(data).indexOf(currentYear.toString()) === -1) getHolidays(currentYear)
    if (Object.keys(data).indexOf((currentYear + 1).toString()) === -1) getHolidays(currentYear + 1)
}
module.exports = updateIfRequired
