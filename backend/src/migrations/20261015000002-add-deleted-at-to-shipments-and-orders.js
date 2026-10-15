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

    if (!tableDescOrders.storefront_connection_id) {
      await queryInterface.addColumn('orders', 'storefront_connection_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }

    if (!tableDescOrders.external_order_id) {
      await queryInterface.addColumn('orders', 'external_order_id', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!tableDescOrders.booking_type) {
      await queryInterface.addColumn('orders', 'booking_type', {
        type: Sequelize.STRING(50),
        defaultValue: 'regular',
        allowNull: false,
      }).catch(() => {});
    }

    if (!tableDescOrders.consignment_type) {
      await queryInterface.addColumn('orders', 'consignment_type', {
        type: Sequelize.STRING(20),
        defaultValue: 'non_document',
        allowNull: false,
      }).catch(() => {});
    }

    if (!tableDescOrders.is_walkin) {
      await queryInterface.addColumn('orders', 'is_walkin', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      }).catch(() => {});
    }

    await queryInterface.addIndex('orders', ['storefront_connection_id', 'external_order_id'], {
      name: 'orders_storefront_connection_id_external_order_id',
      unique: true,
    }).catch(() => {});
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
    if (tableDescOrders.storefront_connection_id) {
      await queryInterface.removeColumn('orders', 'storefront_connection_id');
    }
    if (tableDescOrders.external_order_id) {
      await queryInterface.removeColumn('orders', 'external_order_id');
    }
  },
};
