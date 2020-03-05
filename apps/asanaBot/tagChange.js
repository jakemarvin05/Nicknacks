'use strict'
const debug = require('debug')('nn:apps:asanaBot:tagChange')
debug.log = console.log.bind(console)

const _ = require('lodash')
const config = require('./config.js')

function tagChange(task, toWhichTag) {
    let promises = []

    let toInsertTag = _.find(task.tags, {
        gid: toWhichTag
    })
    if (!toInsertTag) {
        debug('Inserting tag: ' + toWhichTag)
        promises.push(
            ASANA.tasks.addTag(task.gid, { tag: toWhichTag })
        )
    }

    // will look for irrelevant tag to remove
    // first we create a tags array to use
    let tags = config.tags
    let tagsArray = []
    for (let tag in tags) {
        tagsArray.push(tags[tag])
    }

    // loop through the tags array
    for(let i=0; i<tagsArray.length; i++) {
        let tag = tagsArray[i]
        // ignore if it is the current tag
        if (tag === toWhichTag) continue

        // see if this unwanted tag is inside of our task
        let toRemove = _.find(task.tags, {
            gid: tag
        })

        // if yes, remove it
        if (toRemove) {
            debug('Removing tag: ' + tag)
            promises.push(
                ASANA.tasks.removeTag(task.gid, { tag: tag })
            )
        }
    }

    // return the array of promises
    return promises
}

module.exports = tagChange
