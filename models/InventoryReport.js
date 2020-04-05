function InventoryReport(sequelize, DataTypes) {

    var InventoryReport = sequelize.define('InventoryReport', {
        InventoryReportID: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        reportType: {
            type: DataTypes.STRING,
            allowNull: true,
            values: [
                'full',
                'renford'
            ]
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            roles: {
                vendor: true,
                admin: true,
                member: true
            }
        }
    }, {
        timestamps: true,
        tableName: 'InventoryReport',
        instanceMethods: {},
        getterMethods: {},
        classMethods: {}
    });
    return InventoryReport;
};

module.exports = InventoryReport;
