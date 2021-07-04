function adminPath(relativePath) {
    return '/admin_' + process.env.ADMIN_URL_SUFFIX + relativePath
}

const routers = [
    {
        path: '/admin',
        component: (resolve) => require(['./views/facade.vue'], resolve),
        children: [{
            path: 'forget-password-reset/:token',
            title: 'Forget Password Reset',
            name: 'ForgetPasswordReset',
            meta: {
                title: 'Nicknacks - Forget Password Reset'
            },
            component: (resolve) => require(['./views/forget-password-reset.vue'], resolve)
        }]
    }, {
        path: '/admin_' + process.env.ADMIN_URL_SUFFIX,
        component: (resolve) => require(['./views/index.vue'], resolve),
        children: [{
            // ADMIN PATHS
            path: '',
            title: 'Sales',
            name: 'Sales',
            meta: {
                title: 'Nicknacks - Sales'
            },
            component: (resolve) => require(['./views/sales.vue'], resolve)
        }, {
            path: 'delivery',
            title: 'Delivery',
            name: 'Delivery',
            meta: {
                title: 'Nicknacks - Delivery'
            },
            component: (resolve) => require(['./views/delivery.vue'], resolve)
        }, {
            path: 'inventory',
            title: 'Inventory',
            name: 'Inventory',
            meta: {
                title: 'Nicknacks - Inventory'
            },
            component: (resolve) => require(['./views/inventory.vue'], resolve)
        }, {
            path: 'inventory/expanded',
            title: 'Inventory (Expanded)',
            name: 'InventoryExpanded',
            meta: {
                title: 'Nicknacks - Inventory (Expanded)'
            },
            component: (resolve) => require(['./views/inventory-expanded.vue'], resolve)
        }, {
            path: 'inventory/expanded/mto',
            title: 'Inventory (Expanded - MTO)',
            name: 'InventoryExpandedMTO',
            meta: {
                title: 'Nicknacks - Inventory (Expanded - MTO)'
            },
            component: (resolve) => require(['./views/inventory-expanded-mto.vue'], resolve)
        }, {
            path: 'inventory/deactivated',
            title: 'Inventory (Deactivated)',
            name: 'inventoryDeactivated',
            meta: {
                title: 'Nicknacks - Inventory (Deactivated)'
            },
            component: (resolve) => require(['./views/inventory-deactivated.vue'], resolve)
        }, {
            path: 'inventory/log',
            title: 'Inventory Log',
            name: 'InventoryLog',
            meta: {
                title: 'Nicknacks - Inventory Log'
            },
            component: (resolve) => require(['./views/inventory-log.vue'], resolve)
        }, {
            path: 'inventory/cogs',
            title: 'Inventory COGS',
            name: 'InventoryCOGS',
            meta: {
                title: 'Nicknacks - Inventory COGS'
            },
            component: (resolve) => require(['./views/inventory-cogs.vue'], resolve)
        }, {
            path: 'inventory/storage',
            title: 'Inventory Storage',
            name: 'InventoryStorage',
            meta: {
                title: 'Nicknacks - Inventory Storage'
            },
            component: (resolve) => require(['./views/inventory-storage.vue'], resolve)
        }, {
            path: 'reports',
            title: 'Inventory Storage - Reports',
            name: 'InventoryStorageReports',
            meta: {
                title: 'Nicknacks - Inventory Storage Reports'
            },
            component: (resolve) => require(['./views/inventory-storage-report.vue'], resolve)
        }, {
            path: 'inventory/one/:inventoryID',
            title: 'Inventory Info',
            name: 'InventoryInfo',
            meta: {
                title: 'Nicknacks - Inventory Info'
            },
            component: (resolve) => require(['./views/inventory-info.vue'], resolve)
        }, {
            path: 'shipment',
            title: 'Shipment',
            name: 'Shipment',
            meta: {
                title: 'Nicknacks - Shipment'
            },
            component: (resolve) => require(['./views/shipment.vue'], resolve)
        }]
    }, {
        // RENFORD paths
        path: '/renford',
        component: (resolve) => require(['./views/renford/index.vue'], resolve),
        children: [{
            path: '',
            title: 'Inventory Storage',
            name: 'RenfordInventoryStorage',
            meta: {
                title: 'Nicknacks - Inventory Storage'
            },
            component: (resolve) => require(['./views/renford/inventory-storage.vue'], resolve)
        }, {
            path: 'reports',
            title: 'Inventory Storage - Reports',
            name: 'RenfordInventoryStorageReports',
            meta: {
                title: 'Nicknacks - Inventory Storage Reports'
            },
            component: (resolve) => require(['./views/renford/inventory-storage-report.vue'], resolve)
        }]
    }
];
export default routers;
