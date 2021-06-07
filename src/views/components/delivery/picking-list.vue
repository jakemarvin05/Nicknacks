<template>
    <span>
        <span v-for="(location, index) in Object.keys(pickingList)">
            <p><b>[[From {{ Object.keys(pickingList)[index] }}]]</b></p>
            <span v-for="(product, index) in pickingList[location]">
                <p>{{ product.iteration.alphabet }}) <b>{{ product.quantity }}</b> x {{ product.name }} (<i>{{ product.sku }}</i>)</p>
                <p>&nbsp;</p>
            </span>
        </span>
    </span>
</template>

<script>
import D from 'dottie'
import _ from 'lodash'

module.exports = {
    data() {
        return {

        }
    },
    props: {
        soldInventories: Array,
    },
    methods: {},

    computed: {
        pickingList: {
            get() {
                let pickingList = {}
                this.$props.soldInventories.forEach((el, i) => {

                    if (!pickingList[el.StorageLocationName]) pickingList[el.StorageLocationName] = []

                    pickingList[el.StorageLocationName].push({
                        name: el.name,
                        sku: el.sku,
                        quantity: el.quantity,
                        iteration: {
                            numeral: i+1,
                            alphabet: String.fromCharCode(97 + i),
                        }
                    })
                })
                return pickingList
            },
            set() {}

        }
    },
}
</script>
