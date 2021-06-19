const path = require('path')
const fs = require('fs')

ph = {}

ph.data = {}

ph.refresh = function() {
    const data = {}
    const currentYear = (new Date()).getFullYear()

    let files = fs.readdirSync( path.join(__dirname, 'data') ).filter(function (file) {
        return (file.indexOf('.') !== 0) && (file.indexOf('.') !== -1) && (file.indexOf('bak') === -1)
    })

    files.forEach(function (file) {
        let json = require( path.join(__dirname, 'data', file) )
        data[ file.replace('.json', '') ] = json
    })

    this.data = data
}

module.exports = ph
