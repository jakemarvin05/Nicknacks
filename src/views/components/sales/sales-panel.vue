<template>
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
                        <p style="padding-bottom:5px;">
                            <Icon type="ios-cube" /> Product(s) sold (<b>{{ salesReceipt.data.items.length }}</b>)
                        </p>
                        <p>
                            <Card
                                style="font-size:12px;"
                                :padding="5"
                                v-for="(cartItem, index) in salesReceipt.data.items"
                                :key="cartItem.id + '_' + index"
                            >
                                <p><b>{{ index+1 }}</b></p>
                                <p><u>{{ cartItem.name }}</u></p>
                                <p><b>SKU:</b> {{ cartItem.sku }}</p>
                                <p><b>Qty:</b> {{ parseFloat(cartItem["Ordered Qty"]).toFixed(1) }}</p>
                                <p><b>Price:</b> {{ parseFloat(cartItem.Price).toFixed(2) }} </p>

                                <span v-if="cartItem.Options" v-for="(option, label) in cartItem.Options">
                                    <p v-if="label.toLowerCase().indexOf('delivery via staircase') === -1">
                                        <b>{{ label }}:</b> {{ option }}
                                    </p>
                                </span>
                            </Card>
                        </p>
                    </Col>
                    <Col span="1" style="font-size=1px;">&nbsp;</Col>
                    <Col span="12">

                            <p style="padding-bottom:5px;">
                                <Icon type="md-done-all" /> Product(s) tagged (<b>{{ salesReceipt.soldInventories.length }}</b>)
                            </p>
                            <p>
                                <Card
                                    style="font-size:12px;"
                                    :padding="5"
                                    v-for="(soldInventory, index) in salesReceipt.soldInventories"
                                    :key="soldInventory.SoldInventoryID"
                                >
                                    <p><b>{{ index+1 }}</b></p>
                                    <p><u>
                                        <router-link
                                            v-if="['', undefined].indexOf(soldInventory.InventoryID) === -1"
                                            target="_blank"
                                            :to="{ name: 'InventoryInfo', params: { 'inventoryID': soldInventory.InventoryID } }"
                                        >
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
                                    <Button size="small" @click="removeSoldInventoryOK(soldInventory, salesReceipt)" type="error">
                                        <Icon type="ios-trash" /> Del
                                    </Button>
                                    <Collapse v-if="isDeliveryView" style="padding-top: 5px;" simple>
                                        <Panel>
                                            Advanced
                                            <div slot="content">
                                                <transfer-sold-inventory
                                                    :salesReceipt="salesReceipt"
                                                    :soldInventory="soldInventory"
                                                    :storageLocations="storageLocations"
                                                    @transferred="transferred"
                                                ></transfer-sold-inventory>
                                            </div>
                                        </Panel>
                                    </Collapse>


                                </Card>

                                <add-inventory-modal
                                    :canAddProduct="canAddProduct"
                                    :showAddInventoryModal="showAddInventoryModal"
                                    :salesReceipt="salesReceipt"
                                    :inventories="inventories"
                                    @inventory-added="inventoryAdded"
                                ></add-inventory-modal>

                            </p>
                    </Col>
                </Row>
            </p>
        </Panel>
        <Panel v-if="isDeliveryView" name="picking-list">
            Picking List
            <p slot="content">
                <span>
                    <picking-list :soldInventories="salesReceipt.soldInventories"></picking-list>
                </span>
            </p>
        </Panel>
    </Collapse>
</template>
<script>
const domain = process.env.API_DOMAIN
import inventoryStatus from './../inventory/inventory-status'
import addInventoryModal from './add-inventory-modal.vue'
import pickingList from './../delivery/picking-list'
import transferSoldInventory from './transfer-sold-inventory'

export default {
    components: {
        inventoryStatus,
        addInventoryModal,
        pickingList,
        transferSoldInventory,
    },
    data() {
        return {
            // ADD Inventory Form
            showAddInventoryModal: false,
        }
    },
    props: {
        salesReceipt: Object,
        inventories: Array,
        storageLocations: Array,
        canAddProduct: Boolean,
        isDeliveryView: Boolean,
    },
    methods: {
        inventoryAdded (result) {

            this.$emit('inventory-added', {
                salesReceipt: this.salesReceipt,
                soldInventory: result.soldInventory,
                inventory: result.inventory
            })

        },
        addInventory(salesReceipt) {
            this.showAddInventoryModal = true
            this.addInventoryModal.show = true
            this.addInventoryModal.salesReceipt = salesReceipt
            this.addInventoryModal.form = {
                inventoryIndex: '',
                StorageLocationID: '',
                quantity: 1
            }
            this.addInventoryModal.selectedInventory = { stock: [] }
            this.addInventoryModal.inventories = this.inventories

        },
        removeSoldInventoryOK(soldInventory, salesReceipt) {

            this.$Modal.confirm({
                title: 'Delete Sold Inventory Entry',
                content: '<p>Confirm delete sold inventory entry of <strong>' + soldInventory.name + '</strong>?</p>',
                loading: true,
                onOk: () => {

                    this.AXIOS.delete(domain + '/api/v2/inventory/sold/delete', { data: { SoldInventoryID: soldInventory.SoldInventoryID }}).then(response => {
                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        let inventory = response.data.data

                        this.$emit('soldInventoryRemoved', { salesReceipt, soldInventory, inventory })

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)
                        this.$Message.error('Failed request!')

                    }).then(() => {
                        this.$Modal.remove()
                    })

                }
            })
        },
        transferred(salesReceipts) {
            this.$emit('transferred', salesReceipts)
        }
    }
}
</script>
