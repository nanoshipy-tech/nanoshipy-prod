'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    // 1. Align webhook_deliveries columns
    if (hasTable('webhook_deliveries')) {
      const desc = await queryInterface.describeTable('webhook_deliveries').catch(() => ({}));

      // Ensure tenant_webhook_id is nullable for admin webhooks
      if (desc.tenant_webhook_id && !desc.tenant_webhook_id.allowNull) {
        await queryInterface.changeColumn('webhook_deliveries', 'tenant_webhook_id', {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'tenant_webhooks', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        }).catch(() => {});
      }

      // Ensure event_key is nullable
      if (desc.event_key && !desc.event_key.allowNull) {
        await queryInterface.changeColumn('webhook_deliveries', 'event_key', {
          type: Sequelize.STRING(100),
          allowNull: true,
        }).catch(() => {});
      }

      // Ensure status can store VARCHAR(50) status strings
      await queryInterface.changeColumn('webhook_deliveries', 'status', {
        type: Sequelize.STRING(50),
        defaultValue: 'pending',
        allowNull: false,
      }).catch(() => {});

      // Ensure attempts and attempt_number both exist
      if (!desc.attempts) {
        await queryInterface.addColumn('webhook_deliveries', 'attempts', {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        }).catch(() => {});
      }
      if (!desc.attempt_number) {
        await queryInterface.addColumn('webhook_deliveries', 'attempt_number', {
          type: Sequelize.INTEGER,
          defaultValue: 1,
        }).catch(() => {});
      }
    }

    // 2. Create shipping_allocation_rules if not exists
    if (!hasTable('shipping_allocation_rules')) {
      await queryInterface.createTable('shipping_allocation_rules', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        priority: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        scope: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'global',
        },
        tenant_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        pickup_address_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        payment_mode: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'all',
        },
        zone: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'all',
        },
        min_weight_kg: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00,
        },
        max_weight_kg: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 999.00,
        },
        min_order_value: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.00,
        },
        max_order_value: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 999999.00,
        },
        strategy: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'priority_fallback',
        },
        courier_priorities: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: [],
        },
        created_by: {
          type: Sequelize.UUID,
          allowNull: true,
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
      });

      await queryInterface.addIndex('shipping_allocation_rules', [
        'scope', 'tenant_id', 'pickup_address_id', 'is_active', 'priority',
      ], {
        name: 'shipping_allocation_rules_scope_tenant_priority_idx',
      }).catch(() => {});
    }
  },

  down: async () => {},
};
