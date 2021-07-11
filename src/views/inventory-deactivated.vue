<template>
    <div id="main-content">
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Inventory</BreadcrumbItem>
            <BreadcrumbItem>List</BreadcrumbItem>
            <BreadcrumbItem>Deactivated</BreadcrumbItem>
        </Breadcrumb>

        <Icon type="ios-search" /> <Input
            style="width: 250px; padding:20px 0px"
            @on-keyup="searchInventories"
            v-model="search"
            placeholder="Type to search"
        />
        <el-table
            style="width: 100%"
            :data="searchedInventories"
        >
            <el-table-column style="width:10px;" type="expand">
                <template slot-scope="scope">
                    <p><strong>CBM:</strong> {{ scope.row.cbm }}</p>
                    <p><strong>Comments:</strong> {{ scope.row.comments }}</p>
                </template>
            </el-table-column>

            <el-table-column
                min-width="135"
                prop="name"
                label="Name"
                sortable
                :filters="categoryFilters"
                :filter-method="categoryFilterHandler"
            >
                <template slot-scope="scope">
                    <p><router-link target="_blank" :to="{ name: 'InventoryInfo', params: { 'inventoryID': scope.row.InventoryID } }">{{ scope.row.name }}</router-link></p>
                    <p style="font-size: 10px;"><i>{{ scope.row.sku }}</i></p>
                </template>
            </el-table-column>

            <el-table-column min-width="105" label="Stock">
                <template slot-scope="scope">

                    <span style="font-size:11px; line-height: 12px;" v-for="location in scope.row.stock">

                        <span v-if="location.name.toLowerCase() === 'sold' && location.quantity > 0">
                            <a href="javascript:void(0);" @click="showSoldDetails(scope.row)">
                                <p>{{ location.name }}: {{ location.quantity }}</p>
                            </a>
                        </span>
                        <span v-else-if="location.name.toLowerCase() === 'transit' && location.quantity > 0">
                            <a href="javascript:void(0);" @click="showTransitDetails(scope.row)">
                                <p>{{ location.name }}: {{ location.quantity }}</p>
                            </a>
                        </span>
                        <span v-else-if="location.quantity < 0 "><p class="stock-negative-text">{{ location.name }}: {{ location.quantity }}</p></span>
                        <span v-else><p>{{ location.name }}: {{ location.quantity }}</p></span>

                    </span>
                </template>
            </el-table-column>

            <el-table-column
                min-width="50"
                label="Net"
                sortable
            >
                <template slot-scope="scope">
                    <span>{{ scope.row.timeline.list[scope.row.timeline.list.length - 1].stockAvailableAtCurrentDate || 0 }}</span>
                </template>
            </el-table-column>

            <el-table-column
                v-if="$store.state.user.rightsLevel > 9.5"
                min-width="84"
                prop="cogs"
                label="COGS"
                sortable
            ></el-table-column>

            <el-table-column
                prop="cbm"
                label="CBM"
                sortable
            >
                <template slot-scope="scope">
                    <span v-if="parseFloat(scope.row.cbm) === 0 ">
                        <span style="color: red;">{{ scope.row.cbm }}</span>
                    </span>
                    <span v-else>{{ scope.row.cbm }}</span>
                </template>

            </el-table-column>

            <el-table-column
                min-width="62"
                label="Actions"
                v-if="$store.state.user.rightsLevel > 8"
            >
                <template slot-scope="scope">
                    <Button type="success" size="small" @click="activateInv(scope.row)">
                        <Icon type="ios-create" /><span class="inventoryActionText">Activate</span>
                    </Button>
                    <br /> <br />
                    <Button type="error" size="small" @click="deleteInv(scope.row)">
                        <Icon type="ios-create" /><span class="inventoryActionText">Delete</span>
                    </Button>
                </template>
            </el-table-column>
        </el-table>

    </div>
</template>

<style>
.el-table .stock-negative-row {
    background: #f56c6c;
}
.stock-negative-text {
    color: red;
    font-weight: bold;
}
</style>

<script>

import D from 'dottie'
import _ from 'lodash'
import moment from 'moment'

const domain = process.env.API_DOMAIN

export default {
    components: {},
    data () {

        return {
            spinShow: true,
            categoryFilters: [],
            inventories: [],
            searchedInventories: [],

            storageLocations: [],
            search: ''
        }

    },
    methods: {
        categoryFilterHandler (value, row) {
            return row.sku.toLowerCase().indexOf(value.toLowerCase()) === 0
        },
        searchInventories: _.debounce(function(e) {
            this.searchedInventories = this.inventories.filter(
                inventory => !this.search || (
                    inventory.name.toLowerCase().includes(
                        this.search.toLowerCase()
                    ) || inventory.sku.toLowerCase().includes(
                        this.search.toLowerCase()
                    )
                )
            )
        }, 500),
        activateInv(inventory) {
            let self = this
            this.activateInvKey = ''
            let randomKey = new Date().getTime().toString().substring(8,13) // random 5 digits

            this.$Modal.confirm({
                render: (h) => {

                    return [
                        h('h2', 'RE-ACTIVATION'),
                        'You are activating ',
                        h('strong', inventory.name),
                        h('br'), h('br'),
                        'Code: ' + randomKey,
                        h('br'), h('br'),
                        h('Input', {
                            props: {
                                value: this.activateInvKey,
                                autofocus: true,
                                placeholder: 'To confirm, please type the code'
                            },
                            on: {
                                input: (val) => { this.activateInvKey = val }
                            }
                        })
                    ]
                },
                onOk() {

                    if(self.activateInvKey !== randomKey) {
                        alert('Your code entered does not match.')
                        this.$Modal.remove()
                        return
                    }

                    // do activation
                    this.AXIOS.post(this.DOMAIN + '/api/v2/inventory/activate', { InventoryID: inventory.InventoryID }).then(response => {

                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        // remove the inventory from view
                        let index = _.findIndex(this.inventories, ['InventoryID', inventory.InventoryID])
                        self.inventories.splice(index, 1)

                        self.$Message.success(inventory.name + ' has been activated!')
                        self.$Modal.remove()

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)
                        self.$Modal.loading = false
                        setTimeout(() => { self.$Modal.loading = true }, 1)
                        self.$Message.error('Failed request!');

                    })

                },
                loading: true
            })
        },
        deleteInv(inventory) {

            let self = this
            this.deleteInvSKU = ''

            this.$Modal.confirm({
                render: (h) => {

                    return h('p', [
                        h('h1', '⚠️DANGER'),
                        'You are deleting ',
                        h('strong', inventory.name),
                        '. This process is irreversible.',
                        h('br'), h('br'),
                        'Only delete an inventory if you made a mistake in creating it.',
                        h('br'), h('br'),
                        h('Input', {
                            props: {
                                value: this.deleteInvSKU,
                                autofocus: true,
                                placeholder: 'To confirm, please type the product sku'
                            },
                            on: {
                                input: (val) => { this.deleteInvSKU = val }
                            }
                        })
                    ])

                },
                onOk() {

                    if(self.deleteInvSKU.toLowerCase() !== inventory.sku.toLowerCase()) {
                        alert('Your sku entered does not match.')
                        this.$Modal.remove()
                        return
                    }

                    // do delete
                    this.AXIOS.delete(self.DOMAIN + '/api/v2/inventory/delete', { data: {InventoryID: inventory.InventoryID} }).then(response => {

                        if (!D.get(response, 'data.success')) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        // remove the inventory from view
                        let index = _.findIndex(self.inventories, ['InventoryID', inventory.InventoryID])
                        self.inventories.splice(index, 1)

                        self.$Message.success(inventory.name + ' has been deleted!')
                        self.$Modal.remove()

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)

                        self.$Modal.loading = false
                        setTimeout(() => { self.$Modal.loading = true }, 1)
                        self.$Message.error('Failed request!');
                    })

                },
                loading: true
            })
        }
    },
    created () {

        window.V = this

        let timeThen = new Date().getTime()
        this.AXIOS.get(domain + '/api/v2/inventory/all/deactivated').then(response => {

            if (!response.data.success) {
                let error = new Error('API operation not successful.')
                error.response = response
                throw error
            }

            console.log(response.data.data)

            this.inventories = response.data.data
            this.searchedInventories = response.data.data

            let categoryArray = []

            // split up the skus and get the broad categories
            for(let i=0; i<this.inventories.length; i++) {
                let inv = this.inventories[i]
                let sku = inv.sku
                let categoryName = sku.split('-')[0].toLowerCase()

                if (categoryArray.indexOf(categoryName) > -1) continue

                categoryArray.push(categoryName)
            }

            _.sortBy(categoryArray)

            //make categoryArray into filters
            let categoryFilters = []
            for(let i=0; i<categoryArray.length; i++) {
                let cat = categoryArray[i]

                categoryFilters.push({
                    text: cat,
                    value: cat
                })

            }
            this.categoryFilters = categoryFilters

            console.log('GET `inventory/all/deactivated` completed in ' + (new Date().getTime() - timeThen))

        }).catch(CATCH_ERR_HANDLER).then(() => { console.log('Spin stop ' + (new Date().getTime() - timeThen)); this.spinShow = false })

        // get all storage location info
        this.AXIOS.get(domain + '/api/v2/storage-location/all').then(response => {
            if (!response.data.success) {
                let error = new Error('API operation not successful.')
                error.response = response
                throw error
            }
            this.storageLocations = response.data.data
            console.log('completed storage location req')
        }).catch(CATCH_ERR_HANDLER)
    }
}
</script>
