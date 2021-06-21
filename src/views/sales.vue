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

                <Button
                    type="primary"
                    slot="extra"
                    :loading="salesReceipt.submitLoading"
                    :disable="salesReceipt.submitLoading"
                    @click='submitSalesReceipt(salesReceipt.TransactionID, salesReceipt)'
                >
                    <span v-if="!salesReceipt.submitLoading">Submit</span>
                    <span v-else>Loading...</span>
                </Button>

                <asana-button :salesOrderNumber="salesReceipt.salesOrderNumber"></asana-button>

                <sales-panel
                    :salesReceipt="salesReceipt"
                    :inventories="inventories"
                    :canAddProduct="canAddProduct"
                    @inventory-added="addSoldInventory"
                    @soldInventoryRemoved="removeSoldInventory"
                ></sales-panel>

                <Form :ref="salesReceipt.TransactionID" :model="salesReceipt" :rules="salesReceiptFormRules" :label-width="80" style="padding-top: 10px;">
                    <p v-show="$store.state.user.rightsLevel > 9.5">
                        <FormItem prop="totalCOGS" label="COGS">
                            <Input type="text" number v-model="salesReceipt.totalCOGS" placeholder=""></Input>
                        </FormItem>
                    </p>
                    <FormItem prop="comments" label="Comments">
                        <Input type="text" v-model="salesReceipt.comments" placeholder=""></Input>
                    </FormItem>

                </Form>
            </Card>
        </span>
    </div>
</template>
<script>

import D from 'dottie'
const domain = process.env.API_DOMAIN
import M from 'moment'
import inventoryStatus from './components/inventory/inventory-status'
import asanaButton from './components/asana-button'
import salesPanel from './components/sales-panel'

export default {
    components: {
        inventoryStatus,
        asanaButton,
        salesPanel,
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
        }

    },
    methods: {
        submitSalesReceipt (formName, salesReceipt) {

            salesReceipt.submitLoading = true

            this.$refs[formName][0].validate((valid) => {

                if (valid) {

                    let payload = {
                        TransactionID: salesReceipt.TransactionID,
                        COGS: salesReceipt.totalCOGS,
                        comments: salesReceipt.comments
                    }

                    this.AXIOS.post(domain + '/api/v2/sales-receipt/create-sales-receipt', payload).then(response => {

                        // if success: false
                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.response = response
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
        },
        addSoldInventory (data) {

            let { salesReceipt, soldInventory, inventory } = data

            salesReceipt.soldInventories.push(soldInventory)

            // refresh the inventory
            let index = _.findIndex(this.inventories, ['InventoryID', inventory.InventoryID])
            this.$set(this.inventories, index, inventory)

            // re-compute the totalCOGS
            let totalCOGS = 0
            for(let i=0; i<salesReceipt.soldInventories.length; i++) {
                let soldInventory = salesReceipt.soldInventories[i]
                totalCOGS += parseFloat(soldInventory.totalCOGS)
            }
            salesReceipt.totalCOGS = totalCOGS.toFixed(2)
        },
        removeSoldInventory(result) {

            let { salesReceipt, soldInventory, inventory } = result

            // remove the deleted entry
            salesReceipt.soldInventories.splice(salesReceipt.soldInventories.indexOf(soldInventory), 1)

            // re-compute the totalCOGS
            let totalCOGS = 0
            for(let i=0; i<salesReceipt.soldInventories.length; i++) {
                let soldInventory = salesReceipt.soldInventories[i]
                totalCOGS += parseFloat(soldInventory.totalCOGS)
            }
            salesReceipt.totalCOGS = totalCOGS.toFixed(2)

            // refresh the inventory
            let index = _.findIndex(this.inventories, ['InventoryID', inventory.InventoryID])
            this.$set(this.inventories, index, inventory)

            this.$Message.info('Succesfully removed sold inventory entry!')

        },
    },
    created () {

        window.V = this
        window.M = M

        this.AXIOS.get(domain + '/api/v2/sales-receipt/pending/all').then(response => {
            if (!response.data.success) {
                let error = new Error('API operation not successful.')
                error.response = response
                throw error
            }

            //console.log(response.data.data)

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
                error.response = response
                throw error
            }

            //console.log(response.data.data)
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
