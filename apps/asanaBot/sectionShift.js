'use strict'
const debug = require('debug')('nn:apps:asanaBot:sectionShift')
debug.log = console.log.bind(console)

const _ = require('lodash')

function sectionShift(task, toWhichSection) {
    let taskIsInDesiredSection = _.find(task.memberships, {
        section: {
            gid: toWhichSection
        }
    })

    if (!taskIsInDesiredSection) {
        return ASANA.sections.addTask(
            toWhichSection, {
                task: task.gid
            }
        )
    }
    return false
}

module.exports = sectionShift
