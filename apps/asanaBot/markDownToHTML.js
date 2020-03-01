'use strict'

const converter = new (require('showdown')).Converter()
converter.setOption('noHeaderId', true) // we don't want the default behaviour of generating <h1 id="header">

function markDownToHTML(string) {
    return simplifyHTML(converter.makeHtml(string))
}

//asana does not allow a lot of html tags. this function is used to replace the tags
function simplifyHTML(string) {
    //string = string.replace(/[\n]/g, '<br>')
    string = string.replace(/<p>/g, '')
    string = string.replace(/<\/p>/g, '\n')
    string = string.replace(/h1>/g, 'strong>')
    string = string.replace(/h2>/g, 'strong>')
    string = string.replace(/h3>/g, 'strong>')
    string = '<body>' + string + '</body>'
    return string
}

module.exports = markDownToHTML
