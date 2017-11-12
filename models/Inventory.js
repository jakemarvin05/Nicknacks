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
        sku: {
            type: DataTypes.STRING,
            allowNull: true
        },
        comments: {
            type: DataTypes.STRING,
            allowNull: true
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

                // COUNTING FOR SOLD QUANTITIES
                var transactions = D.get(self, 'Transactions');
                var soldQty = null; // null indicates that something is wrong.

                if (transactions) {

                    soldQty = 0; // set quantity to 0 because we found attached model.

                    for(let i=0; i<transactions.length; i++) {
                        var t = transactions[i];

                        // if SoldInventory cross table is not included
                        if (!t.SoldInventory) { 
                            soldQty = false; // false indicates errors query
                            break;
                        }

                        soldQty += parseInt(t.SoldInventory.quantity);
                    }
                }
                stockArray.push({
                    name: 'Sold',
                    quantity: soldQty
                });

                return stockArray.length === 0 ? null : stockArray;

            }
        },
        classMethods: {
            associate: function (models) {

                Inventory.belongsToMany(models.Transaction, {
                    singular: 'Transaction',
                    plural: 'Transactions',
                    foreignKey: 'Inventory_inventoryID',
                    through: 'SoldInventory'
                });

                Inventory.belongsToMany(models.StorageLocation, {
                    singular: 'StorageLocation',
                    plural: 'StorageLocations',
                    foreignKey: 'Inventory_inventoryID',
                    through: 'Inventory_Storage'
                });
            }
        }
    });
    return Inventory;
};

module.exports = Inventory;