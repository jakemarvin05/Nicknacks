<template>
    <span>
        <Button type="warning" size="small" @click="openModal()">
            <Icon type="md-git-compare" /><span class="inventoryActionText">Transfer</span>
        </Button>

        <Modal
            v-model="showModal"
            title="Transfer Inventory"
            :loading="loading"
            @on-ok="transferOK()"
            @on-visible-change="reset()"
        >
            <p>⚠️DANGER: This is <strong>not</strong> for changing the location of the product you tagged. </p>
            <p style="padding:10px 0;">If you wish to change the location, you have to delete the tagging and re-tag with the new location.</p>
            <Form ref="transferInventory" :model="form" :rules="formRules">
                <FormItem prop="transferToStorageLocationID">
                    <Select
                        ref="transferInventorySelect"
                        placeholder="Select location"
                        v-model="form.transferToStorageLocationID" filterable>

                        <Option
                            v-for="(location, index) in storageLocations"
                            :value="parseInt(location.StorageLocationID)"
                            :key="index"
                            :disabled="location.StorageLocationID === soldInventory.StorageLocationID"
                            :label="location.name"
                        >
                            <span>{{ location.name }}</span>
                        </Option>

                    </Select>
                </FormItem>
                <p>To proceed, please key in the product sku:</p>
                <FormItem label="SKU" prop="sku">
                    <Input v-model="form.sku"></Input>
                </FormItem>
            </Form>
        </Modal>

    </span>
</template>
<script>
const domain = process.env.API_DOMAIN
export default {
    data() {
        return {
            showModal: false,
            loading: true,
            form: {
                transferToStorageLocationID: 0,
                sku: ''
            },
            formRules: {
                transferToStorageLocationID: [
                    {
                        required: true,
                        type: 'number',
                        min: 1,
                        message: 'Please select a storage location.',
                        trigger: 'blur' ,
                    }
                ],
            }
        }
    },
    props: {
        salesReceipt: Object,
        soldInventory: Object,
        storageLocations: Array,
    },
    methods: {
        openModal() {
            this.showModal = true
        },
        reset() {
            this.form.transferToStorageLocationID = 0
            this.form.sku = ''
            this.$refs['transferInventory'].resetFields()
            this.$ref['transferInventorySelect'].reset()
        },
        transferOK() {

            this.$refs['transferInventory'].validate(valid => {

                if (!valid) {
                    this.loading = false
                    setTimeout(() => { this.loading = true }, 1)
                    this.$Message.error('Check your entry!')
                    return
                }

                if (this.form.sku.toUpperCase() !== this.soldInventory.sku.toUpperCase()) {
                    this.loading = false
                    setTimeout(() => { this.loading = true }, 1)
                    this.$Message.error('SKU does not match!')
                    return
                }

                let payload = {
                    salesOrderNumber: this.salesReceipt.salesOrderNumber,
                    soldInventoryID: this.soldInventory.SoldInventoryID,
                    inventoryID: this.soldInventory.InventoryID,
                    currentStorageLocationID: this.soldInventory.StorageLocationID,
                    transferToStorageLocationID: this.form.transferToStorageLocationID,
                    quantity: this.soldInventory.quantity,
                }
                //console.log(payload)

                this.AXIOS.put(`${domain}/api/v2/inventory/transfer-sold`, payload).then(res => {
                    // if success: false
                    if (!res.data.success) {
                        let error = new Error('API operation not successful.')
                        error.response = res
                        throw error
                    }

                    this.$emit('transferred', {
                        new: res.data.data,
                        old: this.salesReceipt
                    })

                    this.showModal = false

                }).catch(error => {

                    CATCH_ERR_HANDLER(error)
                    this.$Message.error('Failed request!')

                }).then(() => {
                    this.loading = false
                    setTimeout(() => { this.loading = true }, 1)
                })
            })
        }
    }
}
</script>
