<template>
    <div>
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Inventory</BreadcrumbItem>
            <BreadcrumbItem>Storage</BreadcrumbItem>
        </Breadcrumb>

        <el-table :data="inventories" show-summary>
            <el-table-column
                fixed
                min-width="135"
                prop="name"
                label="Name"
                sortable
                :filters="categoryFilters"
                :filter-method="categoryFilterHandler"
            ></el-table-column>
            <el-table-column
                min-width="135"
                prop="sku"
                label="SKU"
                sortable
            ></el-table-column>

            <el-table-column
                prop="stock[0].quantity"
                label="QTY"
                sortable
            >
            </el-table-column>

            <el-table-column
                prop="cbm"
                label="CBM/unit"
                sortable
            >
                <template slot-scope="scope">
                    <span v-if="parseFloat(scope.row.cbm) === 0 ">
                        <span style="color: red;">{{ scope.row.cbm }}</span>
                    </span>
                    <span v-else>{{ scope.row.cbm }}</span>
                </template>
            </el-table-column>

            <el-table-column
                prop="totalCBM"
                label="TTL CBM"
                sortable
            >

            </el-table-column>

        </el-table>
    </div>
</template>
<script>

import D from 'dottie'
import _ from 'lodash'
import moment from 'moment'
const domain = process.env.API_DOMAIN

export default {
    components: {},
    data () {

        return {
            // data
            inventories: [],

            // view properties
            spinShow: true,
            categoryFilters: []
        }
    },
    methods: {
        categoryFilterHandler (value, row) {
            return row.sku.toLowerCase().indexOf(value.toLowerCase()) === 0
        }
    },
    created () {

        window.V = this

        this.AXIOS.get(domain + '/api/renford/v2/inventory/all').then((inventories => {

            if (!inventories.data.success) {
                let error = new Error('API operation not successful.')
                error.reponse = response
                throw error
            }

            console.log(inventories.data.data)

            this.inventories = inventories.data.data

            let categoryArray = []

            // split up the skus and get the broad categories
            for(let i=0; i<this.inventories.length; i++) {
                let inv = this.inventories[i]
                let sku = inv.sku
                let categoryName = sku.split('-')[0].toLowerCase()

                inv.totalCBM = (parseInt((inv.stock[0].quantity * inv.cbm) * 10000)/10000 || 0)

                if (categoryArray.indexOf(categoryName) > -1) continue

                categoryArray.push(categoryName)
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
            this.categoryFilters = categoryFilters

        })).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })


    }
}
</script>
