'use strict'

const config = {
    workspaces: {
        gns: "1163212291279358"
    },
    teams: {
        gns: "1163212291279360",
        renford: "1164274787472651"
    },
    projects: {
        main: {
            id:"1163211650953761",
            sections: {
                notScheduled: "1163211650953762",
                scheduledButNotConfirmed: "1164258736317066",
                deliveryConfirmed: "1163270200047312"
            }
        },
        renfordDelivery: {
            id:"1164274787472653",
            sections: {}
        }
    },
    tags: {
        notScheduled: "1165039615164465",
        scheduledButNotConfirmed: "1165039615164466",
        deliveryConfirmed: "1184159284923906"
    }
}

module.exports = config
