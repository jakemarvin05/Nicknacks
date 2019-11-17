const routers = [
    {
        path: '/',
        component: (resolve) => require(['./views/index.vue'], resolve),
        children : [{
            path: '',
            title: 'Sales',
            name: 'Sales',
            meta: {
                title: 'Nicknacks - Sales'
            },
            component: (resolve) => require(['./views/sales.vue'], resolve)
        }, {
            path: '/delivery',
            title: 'Delivery',
            name: 'Delivery',
            meta: {
                title: 'Nicknacks - Delivery'
            },
            component: (resolve) => require(['./views/delivery.vue'], resolve)
        }, {
            path: '/inventory',
            title: 'Inventory',
            name: 'Inventory',
            meta: {
                title: 'Nicknacks - Inventory'
            },
            component: (resolve) => require(['./views/inventory.vue'], resolve)
        }, {
            path: '/inventory/log',
            title: 'Inventory Log',
            name: 'InventoryLog',
            meta: {
                title: 'Nicknacks - Inventory Log'
            },
            component: (resolve) => require(['./views/inventory-cogs.vue'], resolve)
        },{
            path: '/inventory/cogs',
            title: 'Inventory COGS',
            name: 'InventoryCOGS',
            meta: {
                title: 'Nicknacks - Inventory COGS'
            },
            component: (resolve) => require(['./views/inventory-cogs.vue'], resolve)
        }, {
            path: '/inventory/one/:inventoryID',
            title: 'Inventory Info',
            name: 'InventoryInfo',
            meta: {
                title: 'Nicknacks - Inventory Info'
            },
            component: (resolve) => require(['./views/inventory-info.vue'], resolve)
        }, {
            path: '/shipment',
            title: 'Shipment',
            name: 'Shipment',
            meta: {
                title: 'Nicknacks - Shipment'
            },
            component: (resolve) => require(['./views/shipment.vue'], resolve)
        }, {
            path: '/login/forget-password-reset/:token',
            title: 'Forget Password Reset',
            name: 'ForgetPasswordReset',
            meta: {
                title: 'Nicknacks - Forget Password Reset'
            },
            component: (resolve) => require(['./views/forget-password-reset.vue'], resolve)
        }]
    }
];
export default routers;
