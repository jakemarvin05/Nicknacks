<template>
    <div v-if="inventory.timeline">
        <Tag v-if="inventory.timeline.list[0].stockAvailableAtCurrentDate < 1" color="red">OOS</Tag>
        <Tag v-else-if="inventory.timeline.list[0].stockAvailableAtCurrentDate < 6" color="orange">Low stock</Tag>
        <Tag v-else-if="inventory.timeline.list[0].stockAvailableAtCurrentDate < 11" color="lime">Re-order</Tag>
        <Tag v-else color="green">In stock</Tag>
    </div>
</template>
<script>
import D from 'dottie'
import _ from 'lodash'
module.exports = {
    data() {
        return {}
    },
    props: {
        inventory: {
            timeline: {
                hasShortFall: Boolean,
                list: []
            }
        }
    },
    computed: {},
    methods: {
        showTimeline() {
            this.timelineModal.inventory = this.inventory
            this.timelineModal.show = true
        }
    }
}
</script>
