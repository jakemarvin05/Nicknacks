<template>

    <div>
        <Button
            style="margin-top: 5px;"
            icon="md-add"
            type="primary"
            @click="addInventory()"
            :disabled="!canAddProduct"
        >
            {{ canAddProduct ? 'Add' : 'Loading..' }}
        </Button>

        <Modal
            v-model="show"
            title="Tag Inventory Sold"
            :loading="loading"
            @on-ok="addInventoryOK('addInventoryForm')"
            @on-visible-change="resetFields()"
        >

            <Form ref="addInventoryForm" :model="addInventoryModal.form" :rules="addInventoryModal.formRules">
                <FormItem prop="inventoryIndex">
                    <Select
                        placeholder="Select product"
                        v-model="addInventoryModal.form.inventoryIndex"
                        filterable
                        @on-change="triggerStorageSelection()"
                    >
                        <Option
                            v-for="(inventory, index) in inventories"
                            :value="index"
                            :key="index"
                            :label="inventory.name"
                        >
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
                            :key="index"
                            :disabled="!stockItem.StorageLocationID"
                            :label="stockItem.name + ' (Qty: ' + stockItem.quantity + ')'"
                        >
                            <span>{{ stockItem.name }} (Qty: {{ stockItem.quantity }})</span>
                        </Option>

                    </Select>
                </FormItem>
                <FormItem label="Quantity" prop="quantity">
                    <InputNumber :max="999" :min="1" v-model="addInventoryModal.form.quantity"></InputNumber>
                </FormItem>
            </Form>

            <p>TransactionID: {{ salesReceipt.TransactionID }}</p>

        </Modal>
    </div>
</template>
<script>
const domain = process.env.API_DOMAIN
export default {
    components: {},
    data() {
        return {
            show: false,
            loading: true,
            // ADD Inventory Form
            addInventoryModal: {
                form: {
                    inventoryIndex: -1,
                    StorageLocationID: '',
                    quantity: 1
                },
                formRules: {
                    inventoryIndex: [
                        { required: true, type: 'number', min: 0, message: 'Please select inventory', trigger: 'blur' }
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
    props: {
        salesReceipt: Object,
        inventories: Array,
        canAddProduct: Boolean,
    },
    methods: {
        resetFields() {
            this.addInventoryModal.form = {
                inventoryIndex: '',
                StorageLocationID: '',
                quantity: 1
            }
            this.addInventoryModal.selectedInventory = { stock: [] }
            this.$refs['addInventoryForm'].resetFields()
            this.$refs['addInventoryFormStorage'].reset()
        },
        triggerStorageSelection() {
            // set the selectedInventory to point to the inventory object within the inventories array
            let i = this.addInventoryModal.form.inventoryIndex
            if (this.inventories[i]) {
                this.addInventoryModal.selectedInventory = this.inventories[i]
                this.$refs['addInventoryFormStorage'].reset()
            }
        },
        addInventoryOK (formName) {

            this.$refs[formName].validate(valid => {

                if (valid) {

                    let payload = {
                        TransactionID: this.salesReceipt.TransactionID,
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

                        this.$emit('inventory-added', response.data.data)
                        this.$Message.success('Success!')
                        this.show = false

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)
                        this.$Message.error('Failed request!')

                    }).then(() => {

                        this.loading = false
                        setTimeout(() => { this.loading = true }, 1)
                    })

                } else {

                    this.loading = false
                    setTimeout(() => { this.loading = true }, 1)
                    this.$Message.error('Check your entry!')
                }
            })
        },
        addInventory() {
            this.show = true
        },
    }
}
</script>
