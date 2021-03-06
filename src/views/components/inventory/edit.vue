<template>
    <Modal
        v-model="modalData.show"
        title="Edit product"
        :loading="loading"
        @on-ok="OK(modalData.inventory)"
        @on-visible-change="copyValues"
    >

        <Form label-position="right" :label-width="80" ref="editInventoryForm" :model="form" :rules="formRules">

            <FormItem label="Name" prop="name">
                <Input v-model="form.name"></Input>
            </FormItem>
            <FormItem label="SKU" prop="sku">
                <Input v-model="form.sku"></Input>
            </FormItem>
            <FormItem label="Supplier" prop="supplier">
                <Input v-model="form.supplier"></Input>
            </FormItem>
            <FormItem label="Supplier SKU" prop="suppliersku">
                <Input v-model="form.suppliersku"></Input>
            </FormItem>
            <FormItem v-if="$store.state.user.rightsLevel > 9.5" prop="cogs" label="COGS">
                <Input type="text" number v-model="form.cogs"></Input>
            </FormItem>
            <FormItem v-if="$store.state.user.rightsLevel > 9.5" label="Supplier Price">
                <Row>
                    <Col span="16" style="padding-right:10px">
                        <FormItem prop="supplierCurrency">
                            <Select placeholder="Select currency" v-model="form.supplierCurrency" filterable>
                                <Option v-for="currency in currencies"
                                :value="currency.abbreviation"
                                :label="currency.abbreviation"
                                :key="currency.abbreviation"
                                >

                                    {{ currency.abbreviation }}
                                    <span class="currency-mobile-hide" style="float:right; color: #ccc"> {{ currency.full }}</span>

                                </Option>
                            </Select>
                        </FormItem>
                    </Col>
                    <Col span="8">
                        <FormItem prop="supplierPrice">
                            <Input type="text" number v-model="form.supplierPrice"></Input>
                        </FormItem>
                    </Col>
                </Row>
            </FormItem>
            <FormItem prop="cbm" label="CBM">
                <Input type="text" number v-model="form.cbm"></Input>
            </FormItem>
            <FormItem label="Comments" prop="comments">
                <Input v-model="form.comments"></Input>
            </FormItem>

        </Form>

        <Collapse>
            <Panel>
                Advanced
                <p slot="content">
                    <Button type="warning" @click="deactivateInv(modalData.inventory)">Deactivate</Button>
                    <Button type="error" @click="deleteInv(modalData.inventory)">Delete</Button>
                </p>
            </Panel>
        </Collapse>

        <p>InventoryID: {{ modalData.inventory.InventoryID }}</p>

    </Modal>
</template>
<script>

import D from 'dottie'
import _ from 'lodash'

module.exports = {
    data() {

        return {
            loading: true,
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
            },
            deactivateInvSKU: '',
            deleteInvSKU: '',
            formRules: {
                name: [
                    { required: true, message: 'The name cannot be empty', trigger: 'blur' }
                ],
                sku: [
                    { required: true, message: 'The sku cannot be empty', trigger: 'blur' }
                ],
                cogs: [{
                    required: true,
                    validator (rule, value, callback) {

                        // check regex
                        let regex = /^\d{1,6}(\.\d{1,2})?$/
                        if (!regex.test(value.toString())) return callback( new Error('Please the value in the correct format.') )

                        // everything passed
                        return callback()

                    },
                    trigger: 'blur'
                }],
                cbm: [{
                    required: true,
                    validator (rule, value, callback) {

                        // check regex
                        let regex = /^\d{1,6}(\.\d{1,6})?$/
                        if (!regex.test(value.toString())) return callback( new Error('Please the value in the correct format.') )

                        // everything passed
                        return callback()

                    },
                    trigger: 'blur'
                }],
                supplierPrice: [{
                    validator (rule, value, callback) {

                        if(!value) return callback()

                        // check regex
                        let regex = /^\d{1,6}(\.\d{1,6})?$/

                        if (!regex.test(value.toString())) return callback( new Error('Please the value in the correct format.') )

                        // everything passed
                        return callback()

                    },
                    trigger: 'blur'
                }],
            },
            currencies: [
                { abbreviation: 'USD', full: 'United States Dollars' },
                { abbreviation: 'CNY', full: 'China Yuan Renmimbi' },
                { abbreviation: 'MYR', full: 'Malaysia Ringgit' },
                { abbreviation: 'SGD', full: 'Singapore Dollars' },
                { abbreviation: 'EUR', full: 'Euro' },
                { abbreviation: 'GBP', full: 'United Kingdom Pounds' },
                { abbreviation: 'AUD', full: 'Australia Dollars' },
                { abbreviation: 'HKD', full: 'Hong Kong Dollars' },
                { abbreviation: 'IDR', full: 'Indonesia Rupiah' },
                { abbreviation: 'JPY', full: 'Japan Yen' },
                { abbreviation: 'PHP', full: 'Philippines Pesos' },
                { abbreviation: 'KRW', full: 'South Korea Won' },
                { abbreviation: 'TWD', full: 'Taiwan Dollars' },
                { abbreviation: 'THB', full: 'Thailand Baht' },
            ],
        }
    },
    props: {
        modalData: {
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
    },
    methods: {
        copyValues(shown) {
            if (shown) {
                Object.assign(this.form, this.modalData.form)
            }
        },
        OK(inventory) {

            let self = this

            let newVal = this.form
            if (
                newVal.name === inventory.name
                && newVal.sku === inventory.sku
                && newVal.supplier === inventory.supplier
                && newVal.suppliersku === inventory.suppliersku
                && newVal.supplierCurrency === inventory.supplierCurrency
                && newVal.supplierPrice === inventory.supplierPrice
                && newVal.cogs === inventory.cogs
                && newVal.cbm === inventory.cbm
                && newVal.comments === inventory.comments
            ) {

                //no changes.
                this.$Message.success('There are no changes made.');
                this.modalData.show = false
                return
            }

            this.$refs['editInventoryForm'].validate(valid => {

                if (!valid) {
                    this.loading = false
                    setTimeout(() => { self.loading = true }, 1)
                    this.$Message.error('Check your entry!');
                    return false
                }

                let payload = {
                    InventoryID: this.modalData.inventory.InventoryID
                }

                if (this.form.sku) this.form.sku = this.form.sku.toUpperCase()

                Object.assign(payload, this.form)

                // supplierprice error when not entered
                if (typeof payload.supplierPrice === 'string' &&  payload.supplierPrice.length === 0) payload.supplierPrice = 0

                this.AXIOS.post(self.DOMAIN + '/api/v2/inventory/update', payload).then(response => {

                    if (!response.data.success) {
                        let error = new Error('API operation not successful.')
                        error.response = response
                        throw error
                    }

                    self.$emit('inventory:edited', response.data.data)
                    this.$Message.success('Success!');
                    this.modalData.show = false

                }).catch(error => {

                    CATCH_ERR_HANDLER(error)
                    this.$Message.error('Failed request!');

                }).then(() => {
                    let self = this
                    this.loading = false
                    setTimeout(() => { self.loading = true }, 1)
                })
            })
        },
        deactivateInv(inventory) {
            let self = this
            this.deactivateInvSKU = ''

            this.$Modal.confirm({
                render: (h) => {

                    return h('Input', {
                        props: {
                            value: this.deactivateInvSKU,
                            autofocus: true,
                            placeholder: 'To confirm, please type the product sku'
                        },
                        on: {
                            input: (val) => { this.deactivateInvSKU = val }
                        }
                    })
                },
                onOk() {

                    if(self.deactivateInvSKU.toLowerCase() !== inventory.sku.toLowerCase()) {
                        alert('Your sku entered does not match.')
                        this.$Modal.remove()
                        return
                    }

                    // do delete
                    this.AXIOS.post(this.DOMAIN + '/api/v2/inventory/deactivate', { InventoryID: inventory.InventoryID }).then(response => {
                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        // remove the inventory from view
                        self.$emit('inventory:deactivatedOrDeleted', inventory.InventoryID)
                        self.$Message.success(inventory.name + ' has been deactivated!')
                        self.$Modal.remove()
                        self.modalData.show = false

                    }).catch(error => {

                        CATCH_ERR_HANDLER(error)
                        self.$Modal.loading = false
                        setTimeout(() => { self.$Modal.loading = true }, 1)
                        self.$Message.error('Failed request!');

                    })

                },
                loading: true
            })
        },
        deleteInv(inventory) {

            let self = this
            this.deleteInvSKU = ''

            this.$Modal.confirm({
                render: (h) => {

                    return h('p', [
                        'DANGER: This process is irreversible. Only delete an inventory if you made a mistake in creating it.',
                        h('Input', {
                            props: {
                                value: this.deleteInvSKU,
                                autofocus: true,
                                placeholder: 'To confirm, please type the product sku'
                            },
                            on: {
                                input: (val) => { this.deleteInvSKU = val }
                            }
                        })
                    ])

                },
                onOk() {

                    if(self.deleteInvSKU.toLowerCase() !== inventory.sku.toLowerCase()) {
                        alert('Your sku entered does not match.')
                        this.$Modal.remove()
                        return
                    }

                    // do delete
                    this.AXIOS.delete(self.DOMAIN + '/api/v2/inventory/delete', { data: {InventoryID: inventory.InventoryID} }).then(response => {
                        if (!response.data.success) {
                            let error = new Error('API operation not successful.')
                            error.response = response
                            throw error
                        }

                        // remove the inventory from view
                        self.$emit('inventory:deactivatedOrDeleted', inventory.InventoryID)
                        self.$Message.success(inventory.name + ' has been deleted!')
                        self.$Modal.remove()
                        self.modalData.show = false

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
    }
}
</script>
