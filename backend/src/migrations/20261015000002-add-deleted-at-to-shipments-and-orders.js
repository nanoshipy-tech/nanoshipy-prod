'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescShipments = await queryInterface.describeTable('shipments').catch(() => ({}));
    if (!tableDescShipments.deleted_at) {
      await queryInterface.addColumn('shipments', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.addIndex('shipments', ['deleted_at'], {
        name: 'shipments_deleted_at_idx',
      }).catch(() => {});
    }

    const tableDescOrders = await queryInterface.describeTable('orders').catch(() => ({}));
    if (!tableDescOrders.deleted_at) {
      await queryInterface.addColumn('orders', 'deleted_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.addIndex('orders', ['deleted_at'], {
        name: 'orders_deleted_at_idx',
      }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    const tableDescShipments = await queryInterface.describeTable('shipments').catch(() => ({}));
    if (tableDescShipments.deleted_at) {
      await queryInterface.removeColumn('shipments', 'deleted_at');
    }

    const tableDescOrders = await queryInterface.describeTable('orders').catch(() => ({}));
    if (tableDescOrders.deleted_at) {
      await queryInterface.removeColumn('orders', 'deleted_at');
    }
  },
};
