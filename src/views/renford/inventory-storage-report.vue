<template>
    <div>
        <Spin size="large" fix v-if="spinShow"></Spin>
        <Breadcrumb class="mainBreadCrumb">
            <BreadcrumbItem>Inventory</BreadcrumbItem>
            <BreadcrumbItem>Storage</BreadcrumbItem>
            <BreadcrumbItem>Report History</BreadcrumbItem>
        </Breadcrumb>

        <Cascader style="max-width: 300px" v-model="reportIndex" :data="reportSelectionData" filterable @on-change="toggleData" clearable placeholder="Select report"></Cascader>

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
            // api data
            reports: [],

            // view properties
            inventories: [],
            spinShow: true,
            categoryFilters: [],
            reportIndex: [],
            reportSelectionData: []
        }
    },
    methods: {
        categoryFilterHandler (value, row) {
            return row.sku.toLowerCase().indexOf(value.toLowerCase()) === 0
        },
        toggleData (value, selectedData) {
            this.spinShow = true

            // need to use setTimeout to force spin show to start
            setTimeout(() => {
                this.inventories = _.cloneDeep(this.reports[value[value.length - 1]].data)

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

                this.spinShow = false
            }, 100)
        }
    },
    created () {

        window.V = this

        this.AXIOS.get(domain + '/api/renford/v2/inventory/storage-report/all').then(reports => {

            if (!reports.data.success) {
                let error = new Error('API operation not successful.')
                error.reponse = response
                throw error
            }

            console.log(reports.data.data)
            this.reports = reports.data.data
            this.reports.unshift({})

            // create the report tree
            for (let i = 1; i < this.reports.length; i++) {

                let report = this.reports[i]
                let date = moment(report.createdAt)

                let foundYear = _.find(this.reportSelectionData, { label: date.year() })

                if (foundYear) {
                    let foundMonth = _.find(foundYear.children, { label: date.format('MMM') })

                    if (foundMonth) {
                        foundMonth.children.push({
                            value: i,
                            label: date.format('ddd, Do, h:mm:ss a')
                        })
                    } else {
                        foundYear.children.push({
                            value: 1,
                            label: date.format('MMM'),
                            children: [{
                                value: i,
                                label: date.format('ddd, Do, h:mm:ss a')
                            }]
                        })
                    }

                } else {
                    this.reportSelectionData.push({
                        value: 1,
                        label: date.year(),
                        children: [{
                            value: 1,
                            label: date.format('MMM'),
                            children: [{
                                value: i,
                                label: date.format('ddd, Do, h:mm:ss a')
                            }]
                        }]
                    })
                }
            }

        }).catch(CATCH_ERR_HANDLER).then(() => { this.spinShow = false })

    }
}
</script>
