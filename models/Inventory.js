function Inventory(sequelize, DataTypes) {

    var Inventory = sequelize.define('Inventory', {
        InventoryID: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        cogs: {
            type: DataTypes.DECIMAL(99,2),
            allowNull: false
        },
        cbm: {
            type: DataTypes.DECIMAL(99,6),
            allowNull: true,
            default: 0
        },
        sku: {
            type: DataTypes.STRING,
            allowNull: true
        },
        comments: {
            type: DataTypes.STRING,
            allowNull: true
        },
        supplier: {
            type: DataTypes.STRING,
            allowNull: true
        },
        suppliersku: {
            type: DataTypes.STRING,
            allowNull: true
        },
        supplierCurrency: {
            type: DataTypes.STRING,
            allowNull: true
        },
        supplierPrice: {
            type: DataTypes.DECIMAL(99,2),
            allowNull: true
        },
        notActive: {
                type: DataTypes.BOOLEAN,
                default: false
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        tableName: 'Inventory',
        instanceMethods: {},
        getterMethods: {
            searchString: function() {
                if (this.name && this.sku) {
                    let str = this.name + ' ' + this.sku
                    if (this.supplier) str += ' ' + this.supplier
                    return str
                }
            },
            stock: function() {
                var self = this;

                var stockArray = [];

                var storedLocations = D.get(self, 'StorageLocations');

                if (storedLocations) {
                    for(let i=0; i<storedLocations.length; i++) {
                        var s = storedLocations[i];
                        stockArray.push({
                            StorageLocationID: s.StorageLocationID,
                            name: s.name,
                            quantity: D.get(s, 'Inventory_Storage.quantity', false)  // false indicates errors query
                        });
                    }
                }

                return stockArray.length === 0 ? null : stockArray;

            }
        },
        classMethods: {
            associate: function (models) {
                Inventory.belongsToMany(models.StorageLocation, {
                    singular: 'StorageLocation',
                    plural: 'StorageLocations',
                    foreignKey: 'Inventory_inventoryID',
                    through: 'Inventory_Storage'
                });

                Inventory.hasMany(models.Inventory_Storage, {
                    singular: 'Inventory_Storage',
                    plural: 'Inventory_Storages',
                    foreignKey: 'Inventory_inventoryID'
                });

                Inventory.belongsToMany(models.Shipment, {
                    singular: 'Shipment',
                    plural: 'Shipments',
                    foreignKey: 'Inventory_inventoryID',
                    through: 'TransitInventory'
                });

                Inventory.hasMany(models.TransitInventory, {
                    singular: 'TransitInventory',
                    plural: 'TransitInventories',
                    foreignKey: 'Inventory_inventoryID'
                });

            }
        }
    });
    return Inventory;
};

module.exports = Inventory;
