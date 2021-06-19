const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')
const readData = require('./readData.js')

const phURL = (year) => `https://rjchow.github.io/singapore_public_holidays/api/${year}/data.json`
const dataFolder = path.join(__dirname, 'data')
const getHolidays = (year) => {

    axios.get( phURL(year) ).then(data => {
        fs.outputFileSync(
            path.join(dataFolder, `${year.toString()}.json`),
            JSON.stringify(data.data)
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
