<template>
    <Button @click="getAverages()" :loading="loading" :disabled="disabled">{{text}}</Button>
</template>

<script>
import _ from 'lodash'

module.exports = {
    data() {
        return {
            loading: false,
            disabled: false,
            text: 'Get turnover',
        }
    },
    props: {
        inventories: Array,
        mto: String || undefined,
    },
    methods: {
        getAverages() {
            this.loading = true
            this.disabled = true

            let self = this

            function params(interval) {
                let params = { params: { interval } }
                if (self.mto === "true") params.params.mto = true
                return params
            }

            Promise.all([
                this.AXIOS.get(this.DOMAIN + '/api/v2/inventory/turnover/all', params(30)),
                this.AXIOS.get(this.DOMAIN + '/api/v2/inventory/turnover/all', params(60)),
            ]).then(responses => {
                for (let i=0; i<responses.length; i++) {
                    if (!responses[i].data.success) {
                        let error = new Error('API operation not successful.')
                        error.response = responses[i]
                        throw error
                    }
                    //console.log(responses[i].data)
                }



                // push the new inventory into view
                this.$emit('inventory:turnover', {
                    ma30d: responses[0].data.data,
                    ma60d: responses[1].data.data
                })

            }).catch(error => {

                CATCH_ERR_HANDLER(error)
                this.$Message.error('Failed request!')

            }).then(() => {
                setTimeout(() => { this.loading = false; this.text = 'Turnover loaded' }, 3000)
            })
        }
    }
}
</script>
