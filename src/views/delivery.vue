
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

                            <asana-button :salesOrderNumber="scope.row.salesOrderNumber"></asana-button>

                            <Button
                                type="primary"
                                slot="extra"
                                :loading="scope.row.submitLoading"
                                :disable="scope.row.submitLoading"
                                @click='deliverSalesReceipt(scope.row)'
                                style="vertical-align:middle;"
                            >
                                <span v-if="!scope.row.submitLoading">Deliver</span>
                                <span v-else>Loading...</span>
                            </Button>
                            <Checkbox
                                style="vertical-align:middle;"
                                slot="extra"
                                v-model="scope.row.completeAsanaTask"
                                border
                            >Complete Asana Task</Checkbox>

                            <sales-panel
                                :salesReceipt="scope.row"
                                :inventories="inventories"
                                :canAddProduct="canAddProduct"
                                :isDeliveryView="true"
                                @inventory-added="addSoldInventory"
                                @soldInventoryRemoved="removeSoldInventory"
                            ></sales-panel>

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

    </div>
</template>
<script>

import D from 'dottie'
import inventoryStatus from './components/inventory/inventory-status'
import asanaButton from './components/asana-button'
import salesPanel from './components/sales-panel'

const domain = process.env.API_DOMAIN

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
                // view properties
                submitLoading: false,
                completeAsanaTask: true,
            }],

            inventories: [],

        }

    },
    methods: {
        deliverSalesReceipt (salesReceipt) {

            salesReceipt.submitLoading = true
            let self = this

            this.$Modal.confirm({
                title: 'Confirm deliver?',
                content: '<p>This action is irreversible. Please check that your product tagging is correct.</p>',
                loading: true,
                onOk: () => {
                    let payload = {
                        TransactionID: salesReceipt.TransactionID,
                        dontCompleteAsanaTask: !salesReceipt.completeAsanaTask,
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
        addSoldInventory (data) {

            let { salesReceipt, soldInventory, inventory } = data

            salesReceipt.soldInventories.push(soldInventory)

            // refresh the inventory
            let index = _.findIndex(this.inventories, ['InventoryID', inventory.InventoryID])
            this.$set(this.inventories, index, inventory)

        },
        removeSoldInventory(result) {

            let { salesReceipt, soldInventory, inventory } = result

            // remove the deleted entry
            salesReceipt.soldInventories.splice(salesReceipt.soldInventories.indexOf(soldInventory), 1)

            // refresh the inventory
            let index = _.findIndex(this.inventories, ['InventoryID', inventory.InventoryID])
            this.$set(this.inventories, index, inventory)

            this.$Message.info('Succesfully removed sold inventory entry!')

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

                salesReceipt.completeAsanaTask = true
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
