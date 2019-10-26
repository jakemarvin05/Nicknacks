<template>
    <div>
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Inventory</BreadcrumbItem>
            <BreadcrumbItem>COGS</BreadcrumbItem>
        </Breadcrumb>

        <Tabs type="card" value="cogsTab">

            <TabPane label="Full Inventory List" name="fullInventoryList">

                <el-table :data="inventories" show-summary>
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
                                <span v-else><p>{{ location.name }}: {{ location.quantity }}</p></span>

                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column
                        min-width="84"
                        prop="cogs"
                        label="COGS"
                        sortable
                    ></el-table-column>

                    <el-table-column
                        prop="holding"
                        label="Holding"
                        sortable
                    ></el-table-column>
                    <el-table-column
                        prop="holdingValue"
                        label="Holding Value"
                        sortable
                    ></el-table-column>
                    <el-table-column
                        prop="transit"
                        label="Transit"
                        sortable
                    ></el-table-column>
                    <el-table-column
                        prop="transitValue"
                        label="Transit Value"
                        sortable
                    ></el-table-column>

                </el-table>

            </TabPane>
            <TabPane label="By Categories" name="byCategories">
                <el-table :data="categoryCOGS" show-summary>
                    <el-table-column
                        fixed
                        min-width="135"
                        prop="categoryName"
                        label="Categories"
                        sortable
                    ></el-table-column>

                    <el-table-column
                        prop="totalHoldingValue"
                        label="Holding Value"
                        sortable
                    ></el-table-column>

                    <el-table-column
                        prop="totalTransitValue"
                        label="Transit Value"
                        sortable
                    ></el-table-column>
                </el-table>
            </TabPane>

        </Tabs>

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
            categoryCOGS: []

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
        }
    },
    created () {

        window.V = this

        this.AXIOS.get(domain + '/api/v2/inventory/all').then(response => {

            if (!response.data.success) {
                let error = new Error('API operation not successful.')
                error.reponse = response
                throw error
            }

            console.log(response.data.data)

            this.inventories = response.data.data

            let categoryArray = []
            let categoryCOGS = []

            let totalHoldingValue = 0
            let totalTransitValue = 0

            // split up the skus and get the broad categories
            // as well as get inventory value
            for(let i=0; i<this.inventories.length; i++) {
                let inv = this.inventories[i]

                // adding up the inventory inventory value
                let stock = inv.stock
                let cogs = inv.cogs
                let singleInventoryValue = 0
                let singleInventoryQuantity = 0
                let singleTransitValue = 0
                let singleTransitQuantity = 0

                for (let i=0; i<stock.length; i++) {

                    let stockByLocation = stock[i]

                    if (stockByLocation.name.toLowerCase() !== 'sold') {

                        if (stockByLocation.name.toLowerCase() !== 'transit') {
                            singleInventoryValue += parseFloat(cogs) * parseInt(stockByLocation.quantity)
                            singleInventoryQuantity += parseInt(stockByLocation.quantity)
                        } else {
                            singleTransitQuantity = parseInt(stockByLocation.quantity)
                            singleTransitValue += parseFloat(inv.cogs) * singleTransitQuantity
                        }

                    }

                }

                inv.holding = singleInventoryQuantity

                inv.holdingValue = Math.round(singleInventoryValue * 100) / 100
                totalHoldingValue += inv.holdingValue

                inv.transit = singleTransitQuantity

                inv.transitValue = Math.round(singleTransitValue * 100) / 100
                totalTransitValue += inv.transitValue



                // category filters and cogs by SKU
                let sku = inv.sku
                let categoryName = sku.split('-')[0].toLowerCase()

                // if cannot find the category
                if (categoryArray.indexOf(categoryName) === -1) {
                    // populate it
                    categoryArray.push(categoryName)
                    categoryCOGS.push({
                        categoryName: categoryName,
                        totalHoldingValue: Math.round(singleInventoryValue * 100) / 100,
                        totalTransitValue: Math.round(singleTransitValue * 100) / 100
                    })
                } else {
                    //add to the values
                    let index = _.findIndex(categoryCOGS, {
                        categoryName: categoryName
                    })

                    categoryCOGS[index].totalHoldingValue += singleInventoryValue
                    categoryCOGS[index].totalTransitValue += singleTransitValue

                    categoryCOGS[index].totalHoldingValue = Math.round(categoryCOGS[index].totalHoldingValue * 100) / 100
                    categoryCOGS[index].totalTransitValue = Math.round(categoryCOGS[index].totalTransitValue * 100) / 100

                }

            }
            console.log(categoryCOGS)
            this.categoryCOGS = categoryCOGS

            this.totalHoldingValue = Math.round(totalHoldingValue * 100) / 100
            this.totalTransitValue = Math.round(totalTransitValue * 100) / 100

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

        }).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })


    }
}
</script>
