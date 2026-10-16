'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add held_balance and credit_limit to wallets table
    const walletDesc = await queryInterface.describeTable('wallets').catch(() => ({}));
    if (!walletDesc.held_balance) {
      await queryInterface.addColumn('wallets', 'held_balance', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
      }).catch(() => {});
    }

    if (!walletDesc.credit_limit) {
      await queryInterface.addColumn('wallets', 'credit_limit', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
      }).catch(() => {});
    }

    // 2. Create payment_gateways table if it does not exist
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    if (!hasTable('payment_gateways')) {
      await queryInterface.createTable('payment_gateways', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
        },
        display_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        mode: {
          type: Sequelize.ENUM('test', 'live'),
          defaultValue: 'test',
        },
        api_key: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        api_secret: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        webhook_secret: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        is_default: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        config: {
          type: Sequelize.JSONB,
          defaultValue: {
            min_recharge: 500,
            max_recharge: 100000,
            presets: [500, 1000, 2000, 5000],
            fee_percent: 0,
            auto_gst_invoice: true,
          },
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    const walletDesc = await queryInterface.describeTable('wallets').catch(() => ({}));
    if (walletDesc.held_balance) await queryInterface.removeColumn('wallets', 'held_balance');
    if (walletDesc.credit_limit) await queryInterface.removeColumn('wallets', 'credit_limit');
    await queryInterface.dropTable('payment_gateways').catch(() => {});
  },
};
