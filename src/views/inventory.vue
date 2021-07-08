<template>
    <div id="main-content">
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Inventory</BreadcrumbItem>
            <BreadcrumbItem>List</BreadcrumbItem>
        </Breadcrumb>

        <Button style="width:400;" type="primary" @click="addProduct()">+ Add product</Button>
        <Button style="width:400;" type="success" @click="exportFile()">> Export</Button>

        <br />
        <Input
            style="width: 250px; padding:20px 0px"
            v-model="search"
            :icon="searchIcon"
            placeholder="Search name/sku"
        />
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="setPage"
          :current-page.sync="currentPage"
          :page-sizes="[100, 200, 400, 1000, 2000]"
          :page-size="pageSize"
          layout="sizes, prev, pager, next"
          :total="totalSize">
        </el-pagination>

        <Alert style="margin-top: 10px;" type="warning" show-icon>Filters and sorting will not work with pagination at the moment, unless all data are in 1 page.</Alert>

        <el-table
            id="inventoryTable"
            ref="inventoryTable"
            style="width: 100%"
            :data="searchInventories"
            :row-class-name="tableRowClassName"
            show-summary
            size="small"
        >
            <el-table-column style="width:10px;" type="expand">
                <template slot-scope="scope">
                    <iframe class="inventoryInfoIFrame" style="height:500px; width: 90%; border: 0px;" :src="$router.resolve({ name: 'InventoryInfo', params: { 'inventoryID': scope.row.InventoryID } }).href"></iframe>
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

            <el-table-column
                min-width="75"
                label="Status"
                prop="timeline"
                :filters="stockLevelFilters"
                :filter-method="stockLevelFilterHandler"
            >
                <template slot-scope="scope">
                    <inventory-status :inventory="scope.row"></inventory-status>
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
                label="Net+Transit"
                prop="stockAvailableWithTransit"
                sortable
            >
                <template slot-scope="scope">
                    <span>{{ scope.row.stockAvailableWithTransit || 0 }}</span>
                </template>
            </el-table-column>

            <el-table-column
                min-width="50"
                label="Net"
                prop="stockAvailablePhysical"
                sortable
            >
                <template slot-scope="scope">
                    <span>{{ scope.row.stockAvailablePhysical || 0 }}</span>
                </template>
            </el-table-column>

            <el-table-column
                v-if="$store.state.user.rightsLevel > 9.5"
                min-width="84"
                prop="cogs"
                label="COGS"
                sortable
            >
                <template slot-scope="scope">
                    <span v-if="parseFloat(scope.row.cogs) === 0 ">
                        <span style="color: red;">{{ scope.row.cogs }}</span>
                    </span>
                    <span v-else>{{ scope.row.cogs }}</span>
                </template>
            </el-table-column>

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
            >
                <template slot-scope="scope">
                    <Button type="primary" size="small" @click="editInventory(scope.row)">
                        <Icon type="ios-create" /><span class="inventoryActionText">Edit</span>
                    </Button>
                    <br>
                    <Button type="warning" size="small" @click="transfer(scope.row)">
                        <Icon type="md-git-compare" /><span class="inventoryActionText">Transfer</span>
                    </Button>
                    <br>
                    <Button type="error" size="small" @click="discrepancy(scope.row)">
                        <Icon type="ios-podium" /><span class="inventoryActionText">Discrepancy</span>
                    </Button>
                </template>
            </el-table-column>
        </el-table>


        <add-inventory-modal
            v-on:inventory:added="lineAdd"
            :modalData="addInventoryModal"></add-inventory-modal>

        <edit-inventory-modal
            v-on:inventory:edited="lineRefresh"
            v-on:inventory:deactivatedOrDeleted="lineRemove"
            :modalData="editInventoryModal"></edit-inventory-modal>

        <discrepancy-modal
            v-on:inventory:discrepancy-complete="lineRefresh"
            :modalData="discrepancyModal"></discrepancy-modal>

        <transfer-inventory-modal
            v-on:inventory:transferred="lineRefresh"
            :stock="stockCache"
            :modalData="transferModal"></transfer-inventory-modal>

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

        <Modal
            v-model="stockErrorModal"
            scrollable
            title="Stock Errors! - Please rectify">
            <span v-for="inventory in inventories" :key="inventory.InventoryID">
                <span v-for="stock in inventory.stock">
                    <p v-if="stock.quantity < 0 " style="padding-bottom: 10px">
                        {{inventory.name}} ( <i>sku: {{inventory.sku}}</i> ) has qty <span class="stock-negative-text">{{stock.quantity}}</span> in {{stock.name}}
                    </p>
                </span>
            </span>
        </Modal>

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
.inventoryInfoIFrame {
    border: 0px;
    width: 90%;
}
@media all (max-width: 767px) {
    .inventoryInfoIFrame {
        height: 350px;
    }
}
@media all (min-width: 768px) {
    .inventoryInfoIFrame {
        height: 500px;
    }
}

</style>

<script>

import fileSaver from 'file-saver'
import xlsx from 'xlsx'

import D from 'dottie'
import _ from 'lodash'
import moment from 'moment'
import transferInventoryModal from './components/inventory/transfer.vue'
import editInventoryModal from './components/inventory/edit.vue'
import addInventoryModal from './components/inventory/add.vue'
import discrepancyModal from './components/inventory/discrepancy.vue'
import inventoryStatus from './components/inventory/inventory-status.vue'

const domain = process.env.API_DOMAIN

export default {
    components: {
        transferInventoryModal,
        editInventoryModal,
        addInventoryModal,
        discrepancyModal,
        inventoryStatus
    },
    data () {

        return {
            stockCache: [],
            spinShow: true,
            categoryFilters: [],
            inventories: [],
            storageLocations: [],

            // EDIT Inventory Form
            editInventoryModal: {
                show: false,
                inventory: Object,
                form: {
                    name: '',
                    sku: '',
                    supplier: '',
                    suppliersku: '',
                    cogs: 0,
                    supplierCurrency: '',
                    supplierPrice: 0,
                    cbm: 0,
                    comments: '',
                }
            },

            // ADD Inventory Form
            addInventoryModal: {
                show: false,
                form: {
                    name: '',
                    sku: '',
                    supplier: '',
                    suppliersku: '',
                    cogs: 0,
                    supplierCurrency: '',
                    supplierPrice: 0,
                    cbm: 0,
                    comments: '',
                }
            },
            transitModal: {
                show: false,
                inventory: ''
            },
            soldModal: {
                show: false,
                inventory: ''
            },
            discrepancyModal: {
                show: false,
                inventory: {
                    stock: [],
                    discrepancyReason: '',
                    final: 0,
                    quantity: 0
                }
            },
            transferModal: {
                show: false,
                inventory: Object
            },
            stockLevelFilters: [{
                text: 'In stock',
                value: "10,9999999999999"
            }, {
                text: 'Re-order',
                value: "5,10"
            }, {
                text: 'Low stock',
                value: "0,5"
            }, {
                text: 'OOS',
                value: "-9999999999,0"
            }, {
                text: 'Bad timeline',
                value: 'badTimeline'
            }],
            search: '',
            debouncedSearch: '',
            searchIcon: 'ios-search',
            stockErrorModal: false,
            stockErrorModalShown: false,

            currentPage: 1,
            pageSize: 100,
            totalSize: 0,
        }

    },
    computed: {
        searching: {
            get() { return this.searchIcon },
            set(value) {
                this.searchIcon = value ? 'ios-loading ivu-load-loop' : 'ios-search'
            },
        },
        searchInventories() {

            let self = this
            function paginate(data) {
                return data.slice(self.pageSize * self.currentPage - self.pageSize, self.pageSize * self.currentPage)
            }

            if (this.debouncedSearch.length === 0) {
                this.totalSize = this.inventories.length
                return paginate(this.inventories)
            }

            let filtered = this.inventories.filter(inventory => {

                let searchStr = inventory.searchString.toLowerCase()

                let term = this.debouncedSearch.toLowerCase()

                let whole = searchStr.includes(term)

                if (whole) return true

                let terms = term.split(' ')

                if (terms.length < 2) return false

                for (let i=0; i < terms.length; i++) {
                    let notFound = !searchStr.includes(terms[i])
                    if (notFound) return false
                }

                return true
            })

            this.totalSize = filtered.length
            return paginate(filtered)
        },
    },
    methods: {
        stockLevelFilterHandler (value, row) {

            // bad timeline filter
            if (value === 'badTimeline') {
                return row.timeline.hasShortFall
            }

            // the rest
            var value = value.split(',')
            return (parseInt(row.timeline.list[0].stockAvailableAtCurrentDate) > parseInt(value[0])) && (parseInt(row.timeline.list[0].stockAvailableAtCurrentDate) < parseInt(value[1]))
        },
        categoryFilterHandler (value, row) {
            return row.sku.toLowerCase().indexOf(value.toLowerCase()) === 0
        },
        lineAdd(inventory) {
            this.inventories.unshift(inventory)
        },
        lineRefresh(inventory) {
            let index = _.findIndex(this.inventories, ['InventoryID', inventory.InventoryID])
            this.$set(this.inventories, index, inventory)
        },
        lineRemove(inventoryID) {
            let index = _.findIndex(this.inventories, ['InventoryID', inventoryID])
            this.inventories.splice(index, 1)
        },

        transfer(inventory) {

            let self = this

            this.stockCache = []

            this.storageLocations.forEach(loc => {
                let obj = {
                    StorageLocationID: loc.StorageLocationID,
                    name: loc.name,
                    quantity: 0,
                    transfer: 0,
                    final: 0
                }
                let id = loc.StorageLocationID
                let inventoryThatHasLocation = _.find(inventory.stock, { StorageLocationID: id })

                if (inventoryThatHasLocation) {
                    obj.quantity = obj.final = parseInt(inventoryThatHasLocation.quantity)
                }
                this.stockCache.push(obj)
            })

            this.transferModal.inventory = inventory
            this.transferModal.show = true
        },
        discrepancy(inventory) {

            var inventory  = _.cloneDeep(inventory)

            // filter away the stock that are not actual storage
            inventory.stock = _.filter(inventory.stock, s => {
                return (  !isNaN( parseInt(s.StorageLocationID) )  )
            })

            // add stuff to it.
            for(let i=0; i<inventory.stock.length; i++) {
                let stock = inventory.stock[i]
                stock.discrepancy = 0
                stock.final = stock.quantity
            }

            inventory.discrepancyReason = ''

            this.discrepancyModal.inventory = inventory

            this.discrepancyModal.show = true
        },
        editInventory (inventory) {

            Object.assign(this.editInventoryModal.form, inventory)
            this.editInventoryModal.inventory = inventory
            this.editInventoryModal.show = true

        },

        showTransitDetails (inventory) {
            this.transitModal.inventory = inventory
            this.transitModal.show = true
        },

        showSoldDetails (inventory) {
            this.soldModal.inventory = inventory
            this.soldModal.show = true
        },

        addProduct() {
            this.addInventoryModal.show = true
        },
        tableRowClassName({row, rowIndex}) {
            console.log()
            // loop through each of the stock info to find erroneous negative stock
            for (let i=0; i<row.stock.length; i++) {
                if (parseInt(row.stock[i].quantity) < 0) {
                    if (!this.stockErrorModalShown) {
                        this.stockErrorModalShown = true // prevents modal from popping up every re-render
                        this.stockErrorModal = true
                    }
                    return 'stock-negative-row';
                }
            }

            return '';
        },
        exportFile() {

            let box = xlsx.utils.table_to_book(document.querySelector('#inventoryTable'))
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
                alert(`Export failed. Error: ${e}`)
            }
            return out
        },
        handleSizeChange (val) {
            this.pageSize = val
        },
        setPage (val) {
          this.currentPage = val
        },
    },
    created () {

        window.V = this

        let timeThen = new Date().getTime()

        Promise.all(
            [
                this.AXIOS.get(domain + '/api/v2/inventory/all', { params: { mto: false }}).then(response => {
                    console.log('GET `inventory/all` completed in ' + (new Date().getTime() - timeThen))
                    return response
                }),
                this.AXIOS.get(domain + '/api/v2/storage-location/all').then(response => {
                    console.log('completed storage location req')
                    return response
                })
            ]
        ).then(responses => {
            for (let i=0; i<responses.length; i++) {
                if (!responses[i].data.success) {
                    let error = new Error('API operation not successful.')
                    error.response = responses[i]
                    throw error
                }
                //console.log(responses[i].data)
            }

            let inventories = responses[0].data.data

            let categoryArray = []

            // split up the skus and get the broad categories
            for(let i=0; i<inventories.length; i++) {
                let inv = inventories[i]
                let sku = inv.sku

                let categoryName = sku.split('-')[0].toLowerCase()

                if (categoryArray.indexOf(categoryName) === -1) categoryArray.push(categoryName)
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

            let storageLocations = responses[1].data.data

            Object.assign(this, {
                storageLocations,
                categoryFilters,
                inventories
            })

        }).catch(CATCH_ERR_HANDLER).then(() => {
            console.log('Spin stop ' + (new Date().getTime() - timeThen))
            this.spinShow = false
        })
    },
    updated() {
        // forever stop the search bar spinning whenever re-rendered
        // double raf technique
        requestAnimationFrame(() => {
            requestAnimationFrame(() => { this.searching = false })
        })
    },
    watch: {
        search: _.debounce(function (e) {
            requestAnimationFrame(() => {
                this.searching = true
                requestAnimationFrame(() => {
                    this.debouncedSearch = this.search
                })
            })
        }, 400),
    },
}
</script>
