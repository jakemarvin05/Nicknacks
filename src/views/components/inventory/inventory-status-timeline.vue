<template>
    <div v-if="inventory.timeline">
        <div>
            <Button size="small" style="font-size:10.5px;" @click="showTimeline()" :type="(inventory.timeline.hasShortFall ? 'error' : 'success' )">
                <span v-if="inventory.timeline.hasShortFall">⚠️</span>
                <span v-else>👍</span>
                Timeline
            </Button>
        </div>
        <timeline-modal :modalData="timelineModal"></timeline-modal>
    </div>
</template>
<script>
import D from 'dottie'
import _ from 'lodash'
import timelineModal from './timeline.vue'

module.exports = {
    components: {
        timelineModal
    },
    data() {
        return {
            timelineModal: {
                show: false,
                inventory: {}
            }
        }
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
