<template>
    <div id="main-content">
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Inventory</BreadcrumbItem>
            <BreadcrumbItem>Storage</BreadcrumbItem>
        </Breadcrumb>

        <Button type="primary" @click="renfordModeToggle()">{{ renfordMode ? 'Full Mode' : 'Renford Only' }}</Button>
        <Button style="width:400;" type="success" @click="exportFile()">> Export</Button>

        <span v-show="!renfordMode">
            <el-table :data="inventories" show-summary id="full">
                <el-table-column
                    fixed
                    min-width="135"
                    prop="name"
                    label="Name"
                    sortable
                    :filters="categoryFilters"
                    :filter-method="categoryFilterHandler"
                ></el-table-column>
                <el-table-column
                    min-width="135"
                    prop="sku"
                    label="SKU"
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
                    :filters="locationFilter"
                    :filter-method="locationFilterHandler"
                    v-for="columnLocation in storageLocations"
                    :label="columnLocation.name"
                    :key="columnLocation.StorageLocationID"
                    :prop="('stockCBM-' + columnLocation.name)"
                >

                </el-table-column>
            </el-table>
        </span>
        <span v-show="renfordMode">
            <el-table :data="renfordInventories" show-summary id="renford">
                <el-table-column
                    fixed
                    min-width="135"
                    prop="name"
                    label="Name"
                    sortable
                    :filters="categoryFilters"
                    :filter-method="categoryFilterHandler"
                ></el-table-column>
                <el-table-column
                    min-width="135"
                    prop="sku"
                    label="SKU"
                    sortable
                ></el-table-column>

                <el-table-column min-width="50" label="Qty">
                    <template slot-scope="scope">
                        <span v-for="location in scope.row.stock">
                            <span v-if="location.name.toLowerCase().indexOf('renford') > -1">{{ location.quantity }}</span>
                        </span>
                    </template>
                </el-table-column>

                <el-table-column
                    prop="cbm"
                    label="Per Unit CBM"
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
                    v-for="columnLocation in storageLocations"
                    v-if="columnLocation.name.toLowerCase().indexOf('renford') > -1"
                    label="Renford Total"
                    :key="columnLocation.StorageLocationID"
                    :prop="('stockCBM-' + columnLocation.name)"
                >

                </el-table-column>
            </el-table>
        </span>

        <Modal
            v-model="transitModal.show"
            title="Transit Info">

            <h1>{{transitModal.inventory.name}}</h1>

            <Card v-for="transitInv in transitModal.inventory.TransitInventories" :key="transitInv.TransactionInventoryID">
                <p slot="title">
                    <Icon type="ios-boat"></Icon>
                    {{transitInv.Shipment.name}}
                </p>
                <p>Quantity: {{transitInv.quantity}}</p>
                <p>Est. Shipout: {{ transitInv.Shipment.estimatedShipOut | unixToDate }}</p>
            </Card>
        </Modal>

        <Modal
            v-model="soldModal.show"
            title="Sold information">

            <h1>{{soldModal.inventory.name}}</h1>
            <span v-for="soldInv in soldModal.inventory.soldInventories" :key="soldInv.Inventory_StorageID">
                <Card v-for="txn in soldInv.Transactions" :key="txn.TransactionID">
                    <p slot="title">
                        <Icon type="ios-cart"></Icon>
                        SO: {{txn.salesOrderNumber}}
                    </p>
                    <p>Name: {{txn.details.customerName}}</p>
                    <p>Date sold: {{ txn.details.transactionDateTime }}</p>
                    <p>Qty: {{ txn.SoldInventory.quantity }}</p>
                </Card>
            </span>
        </Modal>

    </div>
</template>
<script>
import fileSaver from 'file-saver'
import xlsx from 'xlsx'

import D from 'dottie'
import _ from 'lodash'
import moment from 'moment'
const domain = process.env.API_DOMAIN

export default {
    components: {},
    data () {

        return {
            stockCache: [],
            spinShow: true,
            categoryFilters: [],
            inventories: [],
            renfordInventories: [],

            storageLocations: [],

            transitModal: {
                show: false,
                inventory: ''
            },
            soldModal: {
                show: false,
                inventory: ''
            },

            totalHoldingValue: 0,
            totalTransitValue: 0,
            categoryCOGS: [],

            locationFilter: [ { text: 'Select', value: 0 } ],

            renfordMode: false

        }

    },
    methods: {

        categoryFilterHandler (value, row) {
            return row.sku.toLowerCase().indexOf(value.toLowerCase()) === 0
        },

        showTransitDetails (inventory) {
            this.transitModal.inventory = inventory
            this.transitModal.show = true
        },

        showSoldDetails (inventory) {
            this.soldModal.inventory = inventory
            this.soldModal.show = true
        },
        locationFilterHandler (value, row, column) {
            let found = _.find(row.stock, {name: column["label"]})
            if (found && found.quantity && parseFloat(found.quantity) > 0) return true
            return false
        },
        renfordModeToggle () {
            this.renfordMode = this.renfordMode ? false : true


            console.log(this.renfordMode)
        },
        exportFile() {
            this.exporting = true
            setTimeout(() => {
                let id = this.renfordMode ? '#renford' : '#full'
                let box = xlsx.utils.table_to_book(document.querySelector(id))
                let out = xlsx.write(box, {
                    bookType: 'xlsx',
                    bookSST: true,
                    type: 'array'
                })
                try {
                    fileSaver.saveAs(
                        new Blob([out], {
                        type: 'application/octet-stream'
                        }),
                        'nicknacks inventory.xlsx'
                    )
                } catch (e) {
                    this.exporting = false
                    alert(`Export failed. Error: ${e}`)
                }
                this.exporting = false
                return out
            }, 0)
        },
    },
    created () {

        window.V = this

        this.AXIOS.all([
            this.AXIOS.get(domain + '/api/v2/inventory/all'),

            // get all storage location info
            this.AXIOS.get(domain + '/api/v2/storage-location/all')

        ]).then(this.AXIOS.spread((inventories, storageLocations) => {

            if (!storageLocations.data.success) {
                let error = new Error('API operation not successful.')
                error.response = response
                throw error
            }


            if (!inventories.data.success) {
                let error = new Error('API operation not successful.')
                error.response = response
                throw error
            }

            console.log(inventories.data.data)



            let categoryArray = []
            let renfordInventories = []

            // split up the skus and get the broad categories
            for(let i=0; i<inventories.data.data.length; i++) {
                let inv = inventories.data.data[i]
                let sku = inv.sku
                let categoryName = sku.split('-')[0].toLowerCase()

                // create renford inventory
                for (let i=0; i<inv.stock.length; i++) {
                    let stock = inv.stock[i]
                    if (stock.name.toLowerCase().indexOf('renford') > -1 && parseFloat(stock.quantity) > 0) renfordInventories.push(inv)
                }

                // make stockCBM
                // this method is bad but is the only way the table summaries will work
                for (let i=0; i<storageLocations.data.data.length; i++) {
                    let location = storageLocations.data.data[i]

                    let found = _.find(inv.stock, { name: location.name })

                    inv['stockCBM-' + location.name] = (found) ? (parseInt((found.quantity * inv.cbm) * 10000)/10000 || 0) : 0

                }


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

            Object.assign(this, {
                categoryFilters,
                storageLocations: storageLocations.data.data,
                renfordInventories,
                inventories: inventories.data.data
            })

        })).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })


    }
}
</script>
