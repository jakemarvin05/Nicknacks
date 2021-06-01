<template>
    <div>
        <inventory-status-stock :inventory="inventory"></inventory-status-stock>
        <inventory-status-timeline :inventory="inventory"></inventory-status-timeline>
    </div>
</template>
<script>
import D from 'dottie'
import _ from 'lodash'
import inventoryStatusStock from './inventory-status-stock.vue'
import inventoryStatusTimeline from './inventory-status-timeline.vue'

module.exports = {
    components: {
        inventoryStatusStock,
        inventoryStatusTimeline
    },
    data() {
        return {}
    },
    props: {
        inventory: {}
    },
    computed: {},
    methods: {}
}
</script>
