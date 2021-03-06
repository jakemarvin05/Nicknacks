/* NOTE: The constraint of Inventory_inventoryID and StorageLocationID was manually added

        to the database as Sequelize 3 does not support composite key. It is necessary to take
        this step to prevent data inconsistency, especially for all upsert operations on Inventory_Storage.

*/


function Inventory_Storage(sequelize, DataTypes) {

    var Inventory_Storage = sequelize.define('Inventory_Storage', {
        Inventory_StorageID: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        quantity: {
            type: DataTypes.BIGINT,
            allowNull: false
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        tableName: 'Inventory_Storage',
        instanceMethods: {},
        getterMethods: {},
        classMethods: {
            associate: function (models) {

                Inventory_Storage.belongsToMany(models.Transaction, {
                    singular: 'Transaction',
                    plural: 'Transactions',
                    foreignKey: 'Inventory_Storage_inventory_StorageID',
                    through: 'SoldInventory'
                });

                Inventory_Storage.belongsTo(models.StorageLocation, {
                    singular: 'StorageLocation',
                    plural: 'StorageLocations',
                    foreignKey: 'StorageLocation_storageLocationID'
                });

                Inventory_Storage.belongsTo(models.Inventory, {
                    singular: 'Inventory',
                    plural: 'Inventories',
                    foreignKey: 'Inventory_inventoryID'
                });

            }

        }
    });
    return Inventory_Storage;
};

module.exports = Inventory_Storage;
