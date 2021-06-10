<template>
    <Modal
        v-model="modalData.show"
        title="Add product"
        :loading="loading"
        @on-ok="OK()">

        <Form label-position="right" :label-width="80" ref="addInventoryForm" :model="modalData.form" :rules="formRules">

            <FormItem label="Name" prop="name">
                <Input v-model="modalData.form.name"></Input>
            </FormItem>
            <FormItem label="SKU" prop="sku">
                <Input v-model="modalData.form.sku"></Input>
            </FormItem>
            <FormItem label="Supplier" prop="supplier">
                <Input v-model="modalData.form.supplier"></Input>
            </FormItem>
            <FormItem label="Supplier SKU" prop="suppliersku">
                <Input v-model="modalData.form.suppliersku"></Input>
            </FormItem>
            <FormItem prop="cogs" label="COGS">
                <Input type="text" number v-model="modalData.form.cogs"></Input>
            </FormItem>
            <FormItem label="Supplier Price">
                <Row>
                    <Col span="16" style="padding-right:10px">
                        <FormItem prop="supplierCurrency">
                            <Select placeholder="Select currency" v-model="modalData.form.supplierCurrency" filterable>
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
                            <Input type="text" number v-model="modalData.form.supplierPrice"></Input>
                        </FormItem>
                    </Col>
                </Row>
            </FormItem>
            <FormItem prop="cbm" label="CBM">
                <Input type="text" number v-model="modalData.form.cbm"></Input>
            </FormItem>
            <FormItem label="Comments" prop="comments">
                <Input v-model="modalData.form.comments"></Input>
            </FormItem>

        </Form>

    </Modal>
</template>
<script>

import D from 'dottie'
import _ from 'lodash'

module.exports = {
    data() {

        return {
            loading: true,
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
        OK () {

            let self = this

            this.$refs['addInventoryForm'].validate(valid => {

                if (!valid) {
                    this.loading = false
                    setTimeout(() => { self.loading = true }, 1)
                    this.$Message.error('Check your entry!');
                    return false
                }

                if (this.modalData.form.sku) this.modalData.form.sku = this.modalData.form.sku.toUpperCase()

                this.AXIOS.put(this.DOMAIN + '/api/v2/inventory/add', this.modalData.form).then(response => {
                    if (!response.data.success) {
                        let error = new Error('API operation not successful.')
                        error.response = response
                        throw error
                    }
                    console.log(response.data)

                    // push the new inventory into view
                    this.$emit('inventory:added', response.data.data)

                    this.$Message.success('Success!');
                    this.modalData.show = false

                }).catch(error => {

                    CATCH_ERR_HANDLER(error)
                    this.$Message.error('Failed request!')

                }).then(() => {
                    let self = this
                    this.loading = false
                    setTimeout(() => { self.loading = true }, 1)
                })

            })
        }
    }
}
</script>
