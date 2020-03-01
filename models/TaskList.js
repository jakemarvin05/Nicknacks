function TaskList(sequelize, DataTypes) {

    var TaskList = sequelize.define('TaskList', {
        ID: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
        },
        asanaTaskID: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true
        },
        asanaTaskDeliveryTicketID: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true
        },
        salesOrderID: {
            type: DataTypes.BIGINT,
            allowNull: false,
            unique: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: true
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
        },
        errorJSON: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {},
            roles: {
                vendor: true,
                admin: true,
                member: true
            }
        },
    }, {
        timestamps: true,
        tableName: 'TaskList',
        instanceMethods: {},
        getterMethods: {},
        classMethods: {}
    });
    return TaskList;
};

module.exports = TaskList;
