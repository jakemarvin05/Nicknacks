<template>
    <div id="main-content">
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Sales receipts</BreadcrumbItem>
        </Breadcrumb>

        <span v-if="salesReceipts.length < 1">
            <Card class="salesReceiptCard">
                <p slot="title">No outstanding sales receipts for accounting entry.</p>
            </Card>
        </span>

        <span v-else>
            <p>Total sales on this view: {{ totalSalesAmountOnView | toTwoDecimals }}</p>
            <Card v-for="salesReceipt in salesReceipts" :key="salesReceipt.TransactionID" class="salesReceiptCard">
                <p slot="title">
                    <Icon type="ios-cart" />
                    {{ salesReceipt.salesOrderNumber }}
                </p>

                <Button type="primary" slot="extra" :loading="salesReceipt.submitLoading" :disable="salesReceipt.submitLoading" @click='submitSalesReceipt(salesReceipt.TransactionID, salesReceipt)'>
                    <span v-if="!salesReceipt.submitLoading">Submit</span>
                    <span v-else>Loading...</span>
                </Button>

                <Collapse style="max-width: 100%;" value="info">
                    <Panel name="info">
                        Info
                        <p slot="content">
                            <Icon type="ios-person" /> {{ salesReceipt.details.customerName }}<br>
                            <Icon type="ios-mail" /> {{ salesReceipt.details.customerEmail }}<br>
                            <Icon type="ios-phone-portrait" /> {{ salesReceipt.details.customerPhone }}<br>
                            <Icon type="ios-card" /> {{ salesReceipt.paymentMethod }}<br>
                            <Icon type="ios-calendar-outline" /> {{ salesReceipt.details.transactionDateTime }}<br>
                            <Icon type="logo-usd" /> {{ salesReceipt.details.totalAmount | toTwoDecimals }} <br>
                            <Icon type="md-car" />
                            <span v-if="salesReceipt.deliveryDate">
                                {{ salesReceipt.deliveryDate | unixToDate }}
                                <Tag v-if="(  parseInt(salesReceipt.deliveryDate) < ( new Date() ).getTime()  )" color="error">Past due</Tag>
                            </span>
                            <span v-else><Tag color="warning">Not scheduled</Tag></span>
                            <span v-if="salesReceipt.deliveryConfirmed"><Tag color="success">Confirmed</Tag></span>
                        </p>
                    </Panel>
                    <Panel>
                        Products tagging ({{ salesReceipt.data.items.length }} vs {{ salesReceipt.soldInventories.length }})
                        <p slot="content">
                            <Row>
                                <Col span="11">
                                    <p style="padding-bottom:5px;"><Icon type="ios-cube" /> Product(s) sold (<b>{{ salesReceipt.data.items.length }}</b>)</p>
                                    <p>
                                        <Card style="font-size:12px;" :padding="5" v-for="(cartItem, index) in salesReceipt.data.items" :key="cartItem.id + '_' + index">
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

                                        <p style="padding-bottom:5px;"><Icon type="md-done-all" /> Product(s) tagged (<b>{{ salesReceipt.soldInventories.length }}</b>)</p>
                                        <p>
                                            <Card style="font-size:12px;" :padding="5" v-for="(soldInventory, index) in salesReceipt.soldInventories" :key="soldInventory.SoldInventoryID">
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
                                                <p v-if="$store.state.user.rightsLevel > 2">
                                                    <b>COGS:</b> {{ soldInventory.perItemCOGS }}x{{ soldInventory.quantity }} = {{ soldInventory.totalCOGS }}
                                                </p>
                                                <Button size="small" @click="removeSoldInventory(soldInventory, salesReceipt)" type="error">
                                                    <Icon type="ios-trash" /> Del
                                                </Button>

                                            </Card>

                                            <Button style="margin-top: 5px;" icon="md-add" type="primary" @click="addInventory(salesReceipt)" :disabled="!canAddProduct">{{ canAddProduct ? 'Add' : 'Loading..' }}</Button>
                                        </p>
                                </Col>
                            </Row>
                        </p>
                    </Panel>
                </Collapse>

                <Form :ref="salesReceipt.TransactionID" :model="salesReceipt" :rules="salesReceiptFormRules" :label-width="80" style="padding-top: 10px;">
                    <FormItem prop="totalCOGS" label="COGS">
                        <Input type="text" number v-model="salesReceipt.totalCOGS" placeholder=""></Input>
                    </FormItem>
                    <FormItem prop="comments" label="Comments">
                        <Input type="text" v-model="salesReceipt.comments" placeholder=""></Input>
                    </FormItem>

                </Form>
            </Card>
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
const domain = process.env.API_DOMAIN
import M from 'moment'
import inventoryStatus from './components/inventory/inventory-status'

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
                comments: '',

                // view properties
                totalCOGS: '',
                submitLoading: false
            }],

            inventories: [{
                timeline: {
                    hasShortFall: Boolean,
                    list: []
                }
            }],

            // Sales Receipt form
            salesReceiptFormRules: {
                totalCOGS: [
                    {
                        validator (rule, value, callback) {

                            // check regex
                            let regex = /^\d{1,6}(\.\d{1,2})?$/
                            if (!regex.test(value.toString())) return callback( new Error('Please the value in the correct format.') )

                            // everything passed
                            return callback()

                        },
                        trigger: 'blur'
                    }
                ]
            },

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
                    storageLocationID: [
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
                            error.reponse = response
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
                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.reponse = response
                            throw error
                        }

                        // remove the deleted entry
                        salesReceipt.soldInventories.splice(salesReceipt.soldInventories.indexOf(soldInventory), 1)

                        // re-compute the totalCOGS
                        salesReceipt.totalCOGS = 0
                        for(let i=0; i<salesReceipt.soldInventories.length; i++) {
                            let soldInventory = salesReceipt.soldInventories[i]
                            salesReceipt.totalCOGS += parseFloat(soldInventory.totalCOGS)
                        }
                        salesReceipt.totalCOGS = salesReceipt.totalCOGS.toFixed(2)

                        // refresh the inventory
                        let index = _.findIndex(this.inventories, ['InventoryID', response.data.data.InventoryID])
                        this.$set(this.inventories, index, response.data.data)

                        this.$Message.info('Succesfully removed sold inventory entry!')

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)
                        this.$Message.error('Failed request!')

                    }).then(() => {
                        this.$Modal.remove()
                    })

                }
            })
        },
        submitSalesReceipt (formName, salesReceipt) {

            salesReceipt.submitLoading = true

            this.$refs[formName][0].validate((valid) => {

                if (valid) {

                    console.log(salesReceipt)

                    let payload = {
                        TransactionID: salesReceipt.TransactionID,
                        COGS: salesReceipt.totalCOGS,
                        comments: salesReceipt.comments
                    }

                    this.AXIOS.post(domain + '/api/v2/sales-receipt/create-sales-receipt', payload).then(response => {

                        // if success: false
                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.reponse = response
                            throw error
                        }

                        // remove the successful entry
                        this.salesReceipts.splice(this.salesReceipts.indexOf(salesReceipt), 1)

                        this.$Message.success('Successfully submitted sales receipt!');

                    }).catch(error => {

                        this.$Message.error('Failed request!');
                        CATCH_ERR_HANDLER(error)

                    }).then(() => {
                        salesReceipt.submitLoading = false
                    })

                } else {
                    salesReceipt.submitLoading = false
                    this.$Message.error('Check your entry!');
                }
            })
        }
    },
    created () {

        window.V = this
        window.M = M

        this.AXIOS.get(domain + '/api/v2/sales-receipt/pending/all').then(response => {

            if (!response.data.success) {
                let error = new Error('API operation not successful.')
                error.reponse = response
                throw error
            }

            console.log(response.data.data)

            // compute the totalCOGS and total sales amount
            for(let i=0; i<response.data.data.length; i++) {
                let salesReceipt = response.data.data[i]

                salesReceipt.totalCOGS = 0
                this.totalSalesAmountOnView += parseInt(salesReceipt.details.totalAmount)

                for(let i=0; i<salesReceipt.soldInventories.length; i++) {
                    let soldInventory = salesReceipt.soldInventories[i]
                    salesReceipt.totalCOGS += parseFloat(soldInventory.totalCOGS)
                }

                salesReceipt.totalCOGS = salesReceipt.totalCOGS.toFixed(2)
                salesReceipt.submitLoading = false
            }

            this.salesReceipts = response.data.data

        }).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })

        this.AXIOS.get(domain + '/api/v2/inventory/all').then(response => {

            if (!response.data.success) {
                let error = new Error('API operation not successful.')
                error.reponse = response
                throw error
            }

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
