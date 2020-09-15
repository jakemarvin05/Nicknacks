
<template>
    <div id="main-content">
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Delivery</BreadcrumbItem>
        </Breadcrumb>

        <span v-if="salesReceipts.length < 1">
            <Card class="salesReceiptCard">
                <p slot="title">No undelivered sales receipts.</p>
            </Card>
        </span>

        <span v-else>
            <p>Total sales on this view: {{ totalSalesAmountOnView | toTwoDecimals  }}</p>

            <el-table
                style="width: 100%"
                :data="salesReceipts"
            >
                <el-table-column style="width:5px;" type="expand">
                    <template slot-scope="scope">
                        <Card class="salesReceiptCard">
                            <p slot="title">
                                <Icon type="ios-cart"></Icon>
                                {{ scope.row.salesOrderNumber }}
                            </p>

                            <Button type="primary" slot="extra" :loading="scope.row.submitLoading" :disable="scope.row.submitLoading" @click='deliverSalesReceipt(scope.row)'>
                                <span v-if="!scope.row.submitLoading">Deliver</span>
                                <span v-else>Loading...</span>
                            </Button>

                            <Collapse style="max-width: 100%;" value="info">
                                <Panel name="info">
                                    Info
                                    <p slot="content">
                                        <Icon type="ios-person" /> {{ scope.row.details.customerName }}<br>
                                        <Icon type="ios-mail" /> {{ scope.row.details.customerEmail }}<br>
                                        <Icon type="ios-phone-portrait" /> {{ scope.row.details.customerPhone }}<br>
                                        <Icon type="ios-card" /> {{ scope.row.paymentMethod }}<br>
                                        <Icon type="ios-calendar-outline" /> {{ scope.row.details.transactionDateTime }}<br>
                                        <Icon type="logo-usd" /> {{ scope.row.details.totalAmount | toTwoDecimals  }} <br>

                                        <Icon type="md-car" />
                                        <span v-if="scope.row.deliveryDate">
                                            {{ scope.row.deliveryDate | unixToDate }}
                                            <Tag v-if="(  parseInt(scope.row.deliveryDate) < ( new Date() ).getTime()  )" color="error">Past due</Tag>
                                        </span>
                                        <span v-else><Tag color="warning">Not scheduled</Tag></span>
                                        <span v-if="scope.row.deliveryConfirmed"><Tag color="success">Confirmed</Tag></span> <br>

                                        <Icon type="ios-create" />
                                        <span v-if="scope.row.comments" >{{ scope.row.comments }}</span>
                                        <span v-else>Nil</span>
                                    </p>
                                </Panel>
                                <Panel>
                                    Products tagging ({{ scope.row.data.items.length }} vs {{ scope.row.soldInventories.length }})
                                    <p slot="content">
                                        <Row>
                                            <Col span="11">
                                                <p style="padding-bottom:5px;"><Icon type="ios-cube" /> Product(s) sold (<b>{{ scope.row.data.items.length }}</b>)</p>
                                                <p>
                                                    <Card style="font-size:12px;" :padding="5" v-for="(cartItem, index) in scope.row.data.items" :key="cartItem.id + '_' + index">
                                                        <p><b>{{ index+1 }}</b></p>
                                                        <p><u>{{ cartItem.name }}</u></p>
                                                        <p><b>SKU:</b> {{ cartItem.sku }}</p>
                                                        <p><b>Qty:</b> {{ parseFloat(cartItem["Ordered Qty"]).toFixed(1) }}</p>
                                                        <p><b>Price:</b> {{ parseFloat(cartItem.Price).toFixed(2) }} </p>
                                                        <span v-if="cartItem.Options" v-for="(option, label) in cartItem.Options">
                                                            <p v-if="label.toLowerCase().indexOf('delivery via staircase') === -1"><b>{{ label }}:</b> {{ option }}</p>
                                                        </span>
                                                    </Card>
                                                </p>
                                            </Col>
                                            <Col span="1" style="font-size=1px;">&nbsp;</Col>
                                            <Col span="12">

                                                    <p style="padding-bottom:5px;"><Icon type="md-done-all" /> Product(s) tagged (<b>{{ scope.row.soldInventories.length }}</b>)</p>
                                                    <p>
                                                        <Card style="font-size:12px;" :padding="5" v-for="(soldInventory, index) in scope.row.soldInventories" :key="soldInventory.SoldInventoryID">
                                                            <p><b>{{ index+1 }}</b></p>
                                                            <p><u>
                                                                <router-link v-if="['', undefined].indexOf(soldInventory.InventoryID) === -1" target="_blank" :to="{ name: 'InventoryInfo', params: { 'inventoryID': soldInventory.InventoryID } }">
                                                                    {{ soldInventory.name }}
                                                                </router-link>
                                                            </u></p>
                                                            <inventory-status
                                                                v-for="inventory in inventories"
                                                                v-if="parseInt(inventory.InventoryID) === parseInt(soldInventory.InventoryID)"
                                                                :inventory="inventory"
                                                                :key="'inventory_status_for_' + soldInventory.InventoryID"
                                                            ></inventory-status>
                                                            <p><b>SKU:</b> {{ soldInventory.sku }}</p>
                                                            <p><b>Qty:</b> {{ soldInventory.quantity }} (from <b>{{ soldInventory.StorageLocationName }}</b>)</p>
                                                            <p v-if="$store.state.user.rightsLevel > 9.5">
                                                                <b>COGS:</b> {{ soldInventory.perItemCOGS }}x{{ soldInventory.quantity }} = {{ soldInventory.totalCOGS }}
                                                            </p>
                                                            <Button size="small" @click="removeSoldInventory(soldInventory, scope.row)" type="error">
                                                                <Icon type="ios-trash" /> Del
                                                            </Button>

                                                        </Card>

                                                        <Button style="margin-top: 5px;" icon="md-add" type="primary" @click="addInventory(scope.row)" :disabled="!canAddProduct">{{ canAddProduct ? 'Add' : 'Loading..' }}</Button>
                                                    </p>
                                            </Col>
                                        </Row>
                                    </p>
                                </Panel>
                            </Collapse>

                        </Card>
                    </template>
                </el-table-column>

                <el-table-column
                    min-width="60"
                    prop="salesOrderNumber"
                    label="#"
                    sortable
                    :formatter="formatSalesNo"
                ></el-table-column>

                <el-table-column
                    min-width="84"
                    prop="details.customerName"
                    label="Name"
                    sortable
                ></el-table-column>

                <el-table-column
                    min-width="84"
                    prop="details.totalAmount"
                    label="$"
                    :formatter="formatPrice"
                >
                </el-table-column>

                <el-table-column
                    min-width="84"
                    prop="details.transactionDateTime"
                    label="Purchased"
                    sortable
                ></el-table-column>

                <el-table-column
                    min-width="84"
                    label="Delivery"
                    prop="deliveryDate"
                    sortable
                    :formatter="formatDeliveryDate"
                >
                </el-table-column>

                <el-table-column
                    min-width="84"
                    label="Status"
                >
                    <template slot-scope="scope">
                        <span v-if="scope.row.deliveryDate">
                            <Tag v-if="(  parseInt(scope.row.deliveryDate) < ( new Date() ).getTime()  )" color="error">Past due</Tag>
                        </span>
                        <span v-else><Tag color="warning">Not scheduled</Tag></span>
                        <span v-if="scope.row.deliveryConfirmed"><Tag color="success">Confirmed</Tag></span> <br>
                    </template>
                </el-table-column>

            </el-table>

        </span>

        <!-- Make this shared code into a component -->
        <Modal
            v-model="addInventoryModal.show"
            title="Add Inventory"
            :loading="addInventoryModal.loading"
            @on-ok="addInventoryOK('addInventoryForm', addInventoryModal.salesReceipt)">

            <Form ref="addInventoryForm" :model="addInventoryModal.form" :rules="addInventoryModal.formRules">
                <FormItem prop="inventoryIndex">
                    <Select placeholder="Select product" v-model="addInventoryModal.form.inventoryIndex" filterable @on-change="triggerStorageSelection()">
                        <Option v-for="(inventory, index) in addInventoryModal.inventories" :value="index" :key="index" :label="inventory.name">
                            <div :style="{ maxWidth: (windowWidth - 40) + 'px'}">
                                <span style="overflow: hidden; text-overflow: ellipsis; display:block;">{{ inventory.name }}</span>
                                <span style="overflow: hidden; text-overflow: ellipsis; font-size: 11.5px; display:block;"><i>{{ inventory.sku }}</i></span>
                            </div>
                        </Option>
                    </Select>
                </FormItem>
                <FormItem prop="storageLocationID">
                    <Select
                        ref="addInventoryFormStorage"
                        placeholder="Select location"
                        v-model="addInventoryModal.form.storageLocationID" filterable>

                        <Option
                            v-for="(stockItem, index) in addInventoryModal.selectedInventory.stock"
                            :value="stockItem.StorageLocationID || -1"
                            :key="index" :disabled="!stockItem.StorageLocationID" :label="stockItem.name + ' (Qty: ' + stockItem.quantity + ')'">
                            <span>{{ stockItem.name }} (Qty: {{ stockItem.quantity }})</span>
                        </Option>

                    </Select>
                </FormItem>
                <FormItem label="Quantity" prop="quantity">
                    <InputNumber :max="999" :min="1" v-model="addInventoryModal.form.quantity"></InputNumber>
                </FormItem>
            </Form>

            <p>TransactionID: {{ addInventoryModal.salesReceipt.TransactionID }}</p>

        </Modal>

    </div>
</template>
<script>

import D from 'dottie'
import inventoryStatus from './components/inventory/inventory-status'

const domain = process.env.API_DOMAIN

export default {
    components: {
        inventoryStatus
    },
    data () {
        return {

            // view properties
            spinShow: true,
            canAddProduct: false, // inventory takes awhile to retrive. but we don't want to slow the whole view

            salesReceipts: [{
                TransactionID: '',
                details: {
                    customerName: '',
                    customerPhone: '',
                    customerEmail: ''
                },
                paymentMethod: '',
                salesOrderNumber: '',
                soldInventories: [{
                    InventoryID: '',
                    TransactionID: '',
                    quantity: ''
                }],
                data: {
                    items: []
                },
                // view properties
                submitLoading: false
            }],

            //view properties
            inventories: [],

            // ADD Inventory Form
            addInventoryModal: {
                show: false,
                loading: true,
                salesReceipt: '',
                form: {
                    inventoryIndex: '',
                    StorageLocationID: '',
                    quantity: 1
                },
                formRules: {
                    inventoryIndex: [
                        { type: 'number', min: 0, message: 'Please select inventory', trigger: 'blur' }
                    ],
                    StorageLocationID: [
                        { required: true, message: 'Please select a storage location.', trigger: 'blur' }
                    ],
                    quantity: [
                        { type: 'number', min: 1, message: 'Quantity cannot be less than 1', trigger: 'blur' }
                    ]
                },

                selectedInventory: {
                    stock: []
                }
            }

        }

    },
    methods: {

        addInventoryOK (formName, salesReceipt) {

            this.$refs[formName].validate(valid => {

                if (valid) {

                    let payload = {
                        TransactionID: this.addInventoryModal.salesReceipt.TransactionID,
                        InventoryID: this.addInventoryModal.selectedInventory['InventoryID'],
                        StorageLocationID: this.addInventoryModal.form.storageLocationID,
                        quantity: this.addInventoryModal.form.quantity
                    }

                    this.AXIOS.put(domain + '/api/v2/inventory/sold', payload).then(response => {
                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        salesReceipt.soldInventories.push(response.data.data.soldInventory)

                        // refresh the inventory
                        let index = _.findIndex(this.inventories, ['InventoryID', response.data.data.inventory.InventoryID])
                        this.$set(this.inventories, index, response.data.data.inventory)

                        // re-compute the totalCOGS
                        salesReceipt.totalCOGS = 0
                        for(let i=0; i<salesReceipt.soldInventories.length; i++) {
                            let soldInventory = salesReceipt.soldInventories[i]
                            salesReceipt.totalCOGS += parseFloat(soldInventory.totalCOGS)
                        }
                        salesReceipt.totalCOGS = salesReceipt.totalCOGS.toFixed(2)

                        this.$Message.success('Success!')
                        this.addInventoryModal.show = false

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)
                        this.$Message.error('Failed request!')

                    }).then(() => {
                        let self = this
                        this.addInventoryModal.loading = false
                        setTimeout(() => { self.addInventoryModal.loading = true }, 1)
                    })

                } else {
                    let self = this
                    this.addInventoryModal.loading = false
                    setTimeout(() => { self.addInventoryModal.loading = true }, 1)
                    this.$Message.error('Check your entry!')
                }
            })
        },
        addInventory(salesReceipt) {
            this.addInventoryModal.show = true
            this.addInventoryModal.salesReceipt = salesReceipt
            this.addInventoryModal.form = {
                inventoryIndex: '',
                StorageLocationID: '',
                quantity: 1
            }
            this.addInventoryModal.selectedInventory = { stock: [] }
            this.$refs['addInventoryForm'].resetFields()
            this.$refs['addInventoryFormStorage'].reset()
            this.addInventoryModal.inventories = this.inventories

        },
        triggerStorageSelection() {
            // set the selectedInventory to point to the inventory object within the inventories array
            let i = this.addInventoryModal.form.inventoryIndex
            if (this.inventories[i]) {
                this.addInventoryModal.selectedInventory = this.inventories[i]
                this.$refs['addInventoryFormStorage'].reset()
            }
        },
        removeSoldInventory(soldInventory, salesReceipt) {

            this.$Modal.confirm({
                title: 'Delete Sold Inventory Entry',
                content: '<p>Confirm delete sold inventory entry of <strong>' + soldInventory.name + '</strong>?</p>',
                loading: true,
                onOk: () => {

                    this.AXIOS.delete(domain + '/api/v2/inventory/sold/delete', { data: { SoldInventoryID: soldInventory.SoldInventoryID }}).then(response => {
                        if (!response.data.success) return alert(response.data.message)

                        // remove the deleted entry
                        salesReceipt.soldInventories.splice(salesReceipt.soldInventories.indexOf(soldInventory), 1)

                        // re-compute the totalCOGS
                        salesReceipt.totalCOGS = 0
                        for(let i=0; i<salesReceipt.soldInventories.length; i++) {
                            let soldInventory = salesReceipt.soldInventories[i]
                            salesReceipt.totalCOGS += parseFloat(soldInventory.totalCOGS)
                        }
                        salesReceipt.totalCOGS = salesReceipt.totalCOGS.toFixed(2)

                        this.$Modal.remove();
                        this.$Message.info('Succesfully removed sold inventory entry!')

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)

                        this.$Modal.remove()
                        this.$Message.error('Failed request!')

                    })

                }
            })
        },
        deliverSalesReceipt (salesReceipt) {

            salesReceipt.submitLoading = true
            let self = this

            this.$Modal.confirm({
                title: 'Confirm deliver?',
                content: '<p>This action is irreversible. Please check that your product tagging is correct.</p>',
                loading: true,
                onOk: () => {
                    let payload = {
                        TransactionID: salesReceipt.TransactionID
                    }

                    this.AXIOS.post(domain + '/api/v2/sales-receipt/deliver', payload).then(response => {

                        // if success: false
                        if (!response.data.success) {
                            alert(response.data.message)
                            this.$Modal.loading = false
                            setTimeout(() => { self.$Modal.loading = true }, 1)
                            return
                        }

                        this.$Message.success('Successfully delivered sales receipt!');

                        // remove the successful entry
                        this.salesReceipts.splice(this.salesReceipts.indexOf(salesReceipt), 1)
                        this.$Modal.remove()

                    }).catch(error => {

                        this.$Message.error('Failed request!');
                        CATCH_ERR_HANDLER(error)
                    })
                },
                onCancel: () => {
                    salesReceipt.submitLoading = false
                }
            });

        },
        formatDeliveryDate (row, column) {
            if(row.deliveryDate) return this.$options.filters.unixToDate(row.deliveryDate)
            return 'Nil'
        },
        formatSalesNo (row, column) {
            let ID = row.salesOrderNumber

            for(var i=2; i < ID.length; i++) {
                if(ID[i] === "0") continue;
                return ID.substring(i, ID.length);
            }
        },
        formatPrice (row, column) {
            return this.$options.filters.toTwoDecimals(row.details.totalAmount)
        },

        // TODO: figure out price sorting.
        sortPrice (a, b) {
            var a = a.details.totalAmount
            var b = b.details.totalAmount
            console.log(a,b)
            console.log(parseFloat(a) > parseFloat(b))
            return parseFloat(a) > parseFloat(b)
        }
    },

    created () {

        window.V = this

        this.AXIOS.get(domain + '/api/v2/sales-receipt/pending-delivery/all').then(response => {

            if (!response.data.success) return alert(response.data.message)

            console.log(response.data.data)

            for(let i=0; i<response.data.data.length; i++) {
                let salesReceipt = response.data.data[i]

                //compute the
                this.totalSalesAmountOnView += parseInt(salesReceipt.details.totalAmount)

                //salesReceipt.submitLoading = false
            }

            this.salesReceipts = response.data.data

        }).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })

        this.AXIOS.get(domain + '/api/v2/inventory/all').then(response => {
            if (!response.data.success) return alert(response.data.message)
            console.log(response.data.data)
            this.inventories = response.data.data
        }).catch(CATCH_ERR_HANDLER).then(() => { this.canAddProduct = true })
    },

    computed: {
        totalSalesAmountOnView: {
            get() {
                let amt = 0
                for(let i=0; i<this.salesReceipts.length; i++) {
                    let salesReceipt = this.salesReceipts[i]
                    amt += parseFloat(salesReceipt.details.totalAmount)
                }
                return isNaN(amt) ? 0 : amt
            },
            set() {}

        }
    }
}
</script>
