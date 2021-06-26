<template>
    <div id="main-content">
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem :to="{ name: 'Inventory' }">Inventory</BreadcrumbItem>
            <BreadcrumbItem>{{ inventory.name }}</BreadcrumbItem>
        </Breadcrumb>

        <List style="width: 400px; max-width: 100%;" border>
            <ListItem><strong>SKU: </strong> {{inventory.sku}}</ListItem>
            <ListItem v-if="$store.state.user.rightsLevel > 9.5"><strong>Supplier: </strong> {{inventory.supplier}}</ListItem>
            <ListItem v-if="$store.state.user.rightsLevel > 9.5"><strong>Supplier SKU: </strong> {{inventory.suppliersku}}</ListItem>
            <ListItem v-if="$store.state.user.rightsLevel > 9.5"><strong>COGS:</strong> {{inventory.cogs}}</ListItem>
            <ListItem v-if="$store.state.user.rightsLevel > 9.5"><strong>Supplier Price:</strong> {{inventory.supplierCurrency}}{{inventory.supplierPrice}}</ListItem>
            <ListItem><strong>CBM: </strong> {{inventory.cbm}}</ListItem>
            <ListItem><strong>Comments: </strong> {{inventory.comments}}</ListItem>
        </List>

        <Divider style="font-size:20px;" orientation="left">Stock level</Divider>

        <el-table
            v-if="inventory.stock"
            :data="inventory.stock.filter(stock => typeof stock.StorageLocationID !== 'undefined')"
            :summary-method="getPhysicalSummaries"
            show-summary>
            <el-table-column type="index" width="50"></el-table-column>
            <el-table-column prop="name" label="Location"></el-table-column>
            <el-table-column prop="quantity" label="Quantity"></el-table-column>
        </el-table>
        <el-table
            v-if="inventory.stock"
            :data="inventory.stock.filter(stock => typeof stock.StorageLocationID === 'undefined')"
            :summary-method="getNetSummaries"
            show-summary
            :show-header="false">
            <el-table-column type="index" width="50"></el-table-column>
            <el-table-column prop="name" label="Location"></el-table-column>
            <el-table-column prop="quantity" label="Quantity">
                <template slot-scope="scope">
                    <p v-if="scope.row.name.toLowerCase() === 'sold'">{{parseInt(scope.row.quantity) * -1}}</p>
                    <p v-else>{{scope.row.quantity}}</p>
                </template>
            </el-table-column>
        </el-table>

        <Button :disabled="!(availableLocationsToAdd.length > 0)" style="width:400;" type="primary" @click="addLocation()">+ Add location</Button>
        <Button :disabled="!haveEmptyLocations" style="width:400;" type="success" @click="removeEmptyLocation()">- Remove Empty Locations</Button>



        <Divider style="font-size:20px;" orientation="left">Timeline</Divider>

        <timeline-content style="margin-left: 10px;" :inventory="inventory"></timeline-content>

        <Divider style="font-size:20px;" orientation="left">Chart</Divider>
        <el-tag v-if="inventory.stockChart.unscheduledDeliveryCount > 0" type="danger">⚠️<strong>You have <u>{{inventory.stockChart.unscheduledDeliveryCount}}</u> unscheduled {{ inventory.stockChart.unscheduledDeliveryCount > 1 ? "deliveries" : "delivery" }} that will not show on this chart. </strong></el-tag>
        <apexchart :options="options" :series="inventory.stockChart.series"></apexchart>

        <Divider style="font-size:20px;" orientation="left">Movement Records</Divider>

        <el-table :data="movementRecords">

            <el-table-column type="index" width="50"></el-table-column>

            <el-table-column
                min-width="40"
                prop="source"
                label="Source"
                sortable
                :filters="categoryFilters"
                :filter-method="categoryFilterHandler"
            ></el-table-column>

            <el-table-column width="15" type="expand">
                <template slot-scope="scope">
                    <div v-if="scope.row.source === 'shipment'">
                        <div v-for="product in scope.row.sourceData.data.inventorised">
                            <p><strong>{{ product.name }}</strong></p>
                            <p style="margin-left: 15px;" v-for="(value, key) in product.toInventorise.stores" v-if="parseInt(value.quantity) !== 0">
                                {{ key }}: {{value.quantity}}
                            </p>
                        </div>
                    </div>

                    <h2 style="margin-top: 20px;">All data</h2>
                    <vue-json-pretty
                      :path="'res'"
                      :data="scope.row.sourceData"
                      :deep="0"
                    >
                    </vue-json-pretty>
                </template>
            </el-table-column>

            <el-table-column
                min-width="97"
                label="Info"
            >
                <template slot-scope="scope">
                    <div v-if="scope.row.source === 'shipment'">
                        {{ scope.row.sourceData.name }}
                    </div>
                    <div v-else-if="scope.row.source === 'inventoryTransfer'">
                        {{ scope.row.sourceData.reason }}
                    </div>
                    <div v-else-if="scope.row.source === 'quickInventoryTransfer'">

                    </div>
                    <div v-else-if="scope.row.source === 'discrepancy'">
                        {{ scope.row.sourceData.discrepancyReason }}
                    </div>
                    <div v-else-if="scope.row.source === 'delivery'">
                        {{ scope.row.IDStub}} {{ scope.row.sourceData.details.customerName }}
                    </div>
                    <div v-else-if="scope.row.source === 'inventoryDeleted' || scope.row.source === 'inventoryDeactivated'">
                    </div>
                </template>

            </el-table-column>

            <el-table-column label="Movement">
                <template slot-scope="scope">
                    <div v-if="scope.row.source === 'shipment'">
                        <div v-for="product in scope.row.sourceData.data.inventorised" v-if="parseInt(product.InventoryID) === parseInt(inventory.InventoryID)">
                            <p v-for="(value, key) in product.toInventorise.stores" v-if="parseInt(value.quantity) !== 0">
                                {{ key }} <span style="color: green"><Icon type="md-arrow-up" />{{value.quantity}}</span>
                            </p>
                        </div>
                    </div>
                    <div v-else-if="scope.row.source === 'inventoryTransfer' || scope.row.source === 'quickInventoryTransfer'">
                        <span v-for="transfer in scope.row.sourceData.transfer" v-if="parseInt(transfer.transfer) !== 0">
                            {{transfer.name}}
                            <span v-if="parseInt(transfer.transfer) > 0">
                                <span style="color: green"><Icon type="md-arrow-up" />{{transfer.transfer}}<br></span>
                            </span>
                            <span v-else>
                                <span style="color: red"><Icon type="md-arrow-down" />{{transfer.transfer * -1}}<br></span>
                            </span>
                        </span>
                    </div>
                    <div v-else-if="scope.row.source === 'discrepancy'">
                        <span v-for="adjustment in scope.row.sourceData.adjustments">
                            {{adjustment.storageLocationName}}
                            <span v-if="parseInt(adjustment.adjustment) > 0">
                                <span style="color: green"><Icon type="md-arrow-up" />{{adjustment.adjustment}}<br></span>
                            </span>
                            <span v-else>
                                <span style="color: red"><Icon type="md-arrow-down" />{{adjustment.adjustment * -1}}<br></span>
                            </span>
                        </span>
                        <Tag :color="( scope.row.net > 0 ) ? 'success' : 'error'">Net: {{ scope.row.net }}</Tag>
                    </div>
                    <div v-else-if="scope.row.source === 'delivery'">
                        <span v-for="soldInventory in scope.row.sourceData.soldInventories" v-if="parseInt(soldInventory.InventoryID) === parseInt(inventory.InventoryID)">
                            {{soldInventory.StorageLocationName}} <span style="color: red"><Icon type="md-arrow-down" />{{soldInventory.quantity}}</span>
                        </span>
                    </div>
                    <div v-else-if="scope.row.source === 'inventoryDeleted' || scope.row.source === 'inventoryDeactivated'">
                        <span v-for="stored in scope.row.sourceData.storageLocations">
                            {{stored.name}} <span style="color: red"><Icon type="md-arrow-down" />{{stored.Inventory_Storage.quantity}}</span>
                        </span>
                    </div>
                </template>
            </el-table-column>

            <el-table-column min-width="80" prop="user" label="User"></el-table-column>

            <el-table-column min-width="100" prop="createdAt" label="Date" sortable>
                  <template slot-scope="scope">
                      {{ scope.row.createdAt | timestampToDate }}
                  </template>
            </el-table-column>

        </el-table>

        <Modal
            v-model="addLocationModal.show"
            title="Add Location"
            :loading="addLocationModal.loading"
            @on-ok="addLocationOK()">

            <Form ref="addLocation" :model="addLocationModal.form" :rules="addLocationModal.formRules">
                <FormItem prop="storageLocationID">
                    <Select
                        ref="addLocationStorage"
                        placeholder="Select location"
                        v-model="addLocationModal.form.StorageLocationID" filterable>

                        <Option
                            v-for="(location, index) in storageLocations"
                            v-if="(availableLocationsToAdd.indexOf(location.StorageLocationID) > -1 )"
                            :value="location.StorageLocationID || -1"
                            :key="index" :label="location.name">
                            <span>{{ location.name }}</span>
                        </Option>

                    </Select>
                </FormItem>
            </Form>

        </Modal>

    </div>
</template>
<script>

import D from 'dottie'
import _ from 'lodash'
import moment from 'moment'

import timelineContent from './components/inventory/timeline-content.vue'

export default {
    components: {
        timelineContent
    },
    data () {

        return {
            spinShow: true,
            inventory: {
                name: String,
                sku: String,
                InventoryID: String,
                timeline: {
                    list: [],
                    hasShortFall: Boolean
                },
                stockChart: {
                    series: [],
                    unscheduledDeliveryCount: 0
                }
            },
            movementRecords: [],
            storageLocations: [],
            categoryFilters: [],
            physicalSums: [],

            options: {
                chart: {},
                xaxis: {
                    type: 'datetime'
                },
                yaxis: {
                    title: {
                        text: 'Qty'
                    },
                },
                plotOptions: {
                    bar: {
                        colors: {
                            ranges: [{
                                from: -999999999999,
                                to: -1,
                                color: '#F15B46'
                            }]
                        },
                        columnWidth: '150%'
                    },

                },
                stroke: {
                    width: [0, 4]
                },
                dataLabels: {
                  enabled: true,
                  enabledOnSeries: [1]
                }
            },

            addLocationModal: {
                show: false,
                loading: true,
                form: {
                    StorageLocationID: ''
                },
                formRules: {
                    StorageLocationID: [
                        { required: true, message: 'Please select a storage location.', trigger: 'blur' }
                    ]
                },

            }
        }
    },
    methods: {
        categoryFilterHandler (value, row) {
            return row.source.indexOf(value.toLowerCase()) === 0
        },
        getPhysicalSummaries(param) {
            const { columns, data } = param;
            const sums = [];
            columns.forEach((column, index) => {
              if (index === 0) {
                sums[index] = '';
                return;
              }
              if (index === 1) {
                sums[index] = 'Total physical';
                return;
              }
              const values = data.map(item => Number(item[column.property]));
              if (!values.every(value => isNaN(value))) {
                sums[index] = values.reduce((prev, curr) => {
                  const value = Number(curr);
                  if (!isNaN(value)) {
                    return prev + curr;
                  } else {
                    return prev;
                  }
                }, 0);
              } else {
                sums[index] = 'N/A';
              }
            });

            this.physicalSums = sums

            return sums;
        },
        getNetSummaries(param) {
            const { columns, data } = param;
            const sums = [];
            columns.forEach((column, index) => {
                if (index === 0) {
                    sums[index] = '';
                    return;
                }
                if (index === 1) {
                    sums[index] = 'Total net';
                    return;
                }
                const values = data.map(item => {
                    if(item.name.toLowerCase() === 'sold') {
                        return -Number(item[column.property])
                    } else {
                        return Number(item[column.property])
                    }
                });
                if (!values.every(value => isNaN(value))) {
                    sums[index] = values.reduce((prev, curr) => {
                        const value = Number(curr);
                        if (!isNaN(value)) {
                            return prev + curr;
                        } else {
                            return prev;
                        }
                    }, 0);
                } else {
                    sums[index] = 'N/A';
                }
            });

            // add the phyiscal sums to net.
            sums[2] += this.physicalSums[2]

            return sums;
        },
        addLocation() {
            this.addLocationModal.show = true
        },
        addLocationOK () {

            this.$refs['addLocation'].validate(valid => {

                if (valid) {

                    let payload = {
                        InventoryID: this.inventory.InventoryID,
                        StorageLocationID: this.addLocationModal.form.StorageLocationID,
                        quantity: 0
                    }

                    this.AXIOS.put(this.DOMAIN + '/api/v2/inventory/add-location', payload).then(response => {

                        if (!D.get(response, 'data.success')) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        this.inventory.stock.push({
                            name: (_.find(this.storageLocations, { StorageLocationID: this.addLocationModal.form.StorageLocationID })).name,
                            StorageLocationID: this.addLocationModal.form.StorageLocationID,
                            quantity: 0
                        })

                        this.$Message.success('Success!')
                        this.addLocationModal.show = false

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)
                        this.$Message.error('Failed request!')

                    }).then(() => {
                        let self = this
                        this.addLocationModal.loading = false
                        setTimeout(() => { self.addLocationModal.loading = true }, 1)
                    })

                } else {
                    let self = this
                    this.addLocationModal.loading = false
                    setTimeout(() => { self.addLocationModal.loading = true }, 1)
                    this.$Message.error('Check your entry!')
                }
            })
        },
        removeEmptyLocation () {
            let self = this
            this.$Modal.confirm({
                render: (h) => {
                    return [
                        h('h2', 'Remove Empty Locations'),
                        'You are removing all empty locations to reduce clutter. Proceed?'
                    ]
                },
                onOk() {

                    // do cleaning
                    this.AXIOS.delete(this.DOMAIN + '/api/v2/inventory/delete-empty-locations', { data: {InventoryID: self.inventory.InventoryID } }).then(response => {

                        if (!D.get(response, 'data.success')) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        // remove the inventory from view
                        for(let i=0; i<self.inventory.stock.length; i++) {
                            console.log(i)
                            let storage = self.inventory.stock[i]
                            if (storage.quantity === 0 || storage.quantity === "0") {
                                if (storage.StorageLocationID) {
                                    self.inventory.stock.splice(i, 1)
                                    i--
                                }
                            }
                        }

                        self.$Message.success('Empty locations removed!')
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
    computed: {
        availableLocationsToAdd() {
            let availableLocations = []
            if (!this.inventory.stock) return availableLocations
            for (let i=0; i<this.storageLocations.length; i++) {
                let location = this.storageLocations[i]
                let found = _.find(this.inventory.stock, {StorageLocationID: location.StorageLocationID})
                if (!found) availableLocations.push(location.StorageLocationID)
            }
            return availableLocations
        },
        haveEmptyLocations() {
            if (!this.inventory.stock) return false
            for (let i=0; i<this.inventory.stock.length; i++) {
                let s = this.inventory.stock[i]
                // check for existence of storageLocationID
                // if there is it means that the stock is not a "transient" one like transit or sold
                if (s.StorageLocationID && (s.quantity === 0 || s.quantity === "0")) return true
            }
            return false
        }
    },
    created () {

        window.V = this
        var self = this

        this.AXIOS.get(this.DOMAIN + '/api/v2/inventory/one/audit-log/' + this.$route.params.inventoryID).then(response => {

            if (!response.data.success) {
                let error = new Error('API operation not successful.')
                error.response = response
                throw error
            }

            let categoryArray = []
            // split up the skus and get the broad categories
            for(let i=0; i<response.data.data.movementRecords.length; i++) {
                let record = response.data.data.movementRecords[i]
                let source = record.source

                // discrepancy final count
                if (source === 'discrepancy') {
                    let count = 0
                    record.sourceData.adjustments.forEach(adjust => {
                        count += parseInt(adjust.adjustment)
                    })
                    record.net = count
                }

                if(source === 'delivery') {
                    // id
                    record.IDStub = (function(ID) {
                        var stub
                        for(let i=2; i < ID.length; i++) {
                            if(ID[i] === "0") continue;
                            stub = "#" + ID.substring(i, ID.length);
                            break;
                        }
                        return stub
                    })(record.sourceData.salesOrderNumber)
                }


                if (categoryArray.indexOf(source) > -1) continue
                categoryArray.push(source)
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

            console.log(response.data.data)

            this.categoryFilters = categoryFilters
            this.movementRecords = response.data.data.movementRecords
            this.inventory = response.data.data.inventory


        }).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })


        // get all storage location info
        this.AXIOS.get(this.DOMAIN + '/api/v2/storage-location/all').then(response => {
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
