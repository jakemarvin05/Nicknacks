<template>
    <span style="display: inline-block; margin-bottom: 5px;">
        <Button
            type="info" size="small"
            :loading="loading"
            :disable="loading"
            @click="seeAsana('task')">
            <span v-if="!loading">see Asana task</span>
            <span v-else>Loading...</span>
        </Button>
        <Button
            type="info" size="small"
            :loading="loading"
            :disable="loading"
            @click="seeAsana('delivery')">
            <span v-if="!loading">see Asana delivery</span>
            <span v-else>Loading...</span>
        </Button>
    </span>
</template>

<script>
import axios from 'axios'
const domain = process.env.API_DOMAIN

module.exports = {
    data() {
        return {
            loading: false,
            asanaTaskID: '',
            asanaTaskDeliveryTicketID: '',
        }
    },
    props: {
        salesOrderNumber: String,
    },
    methods: {
        seeAsana(type) {

            let asanaLink = 'https://app.asana.com/0/1163211650953761/'

            let accessor = ''

            if (type === 'task') {
                accessor = 'asanaTaskID'
            } else {
                accessor = 'asanaTaskDeliveryTicketID'
            }

            if (this.asanaTaskID.length !== 0) return this.openInNewTab(`${asanaLink}${this[accessor]}`)

            this.loading = true

            this.AXIOS.get(`${domain}/api/v2/asana/task-url/${this.$props.salesOrderNumber}`).then(response => {
                if (!response.data.success) {
                    let error = new Error('API operation not successful.')
                    error.response = response
                    throw error
                }
                console.log(response)

                this.asanaTaskID = response.data.data.asanaTaskID
                this.asanaTaskDeliveryTicketID = response.data.data.asanaTaskDeliveryTicketID

                return this.openInNewTab(`${asanaLink}${response.data.data[accessor]}`)

            }).then(() => {
                this.loading = false
            }).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })
        },
        openInNewTab(href) {
            Object.assign(document.createElement('a'), {
                target: '_blank',
                href: href,
            }).click()
        }
    },

    computed: {},
}
</script>
