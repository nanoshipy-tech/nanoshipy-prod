'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name) || tables.includes(name.toLowerCase());

    // 1. growax_integrations
    if (!hasTable('growax_integrations')) {
      await queryInterface.createTable('growax_integrations', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        seller_id: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: 'tenants',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        api_base_url: {
          type: Sequelize.STRING(255),
          allowNull: false,
          defaultValue: 'https://crm.growax.in',
        },
        api_key: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        sender_number: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        brand_name: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        is_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        webhook_secret: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('not_configured', 'connected', 'failed'),
          allowNull: false,
          defaultValue: 'not_configured',
        },
        last_verified_at: {
          type: Sequelize.DATE,
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
    }

    await queryInterface.addIndex('growax_integrations', ['seller_id'], {
      name: 'growax_integrations_seller_id_idx',
      unique: true,
    }).catch(() => {});

    // 2. growax_templates
    if (!hasTable('growax_templates')) {
      await queryInterface.createTable('growax_templates', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        seller_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        event_key: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        growax_template_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        language: {
          type: Sequelize.STRING(10),
          allowNull: false,
          defaultValue: 'en',
        },
        variable_mapping: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: {},
        },
        is_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
    }

    await queryInterface.addIndex('growax_templates', ['seller_id', 'event_key'], {
      name: 'growax_templates_seller_event_unique',
      unique: true,
    }).catch(() => {});

    // 3. growax_message_logs
    if (!hasTable('growax_message_logs')) {
      await queryInterface.createTable('growax_message_logs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        seller_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: true,
        },
        awb: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        event_key: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        to_number: {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        template_name: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        request_payload: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        response_payload: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM('queued', 'sent', 'delivered', 'read', 'failed'),
          allowNull: false,
          defaultValue: 'queued',
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        retry_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
    }

    await queryInterface.addIndex('growax_message_logs', ['seller_id', 'created_at'], {
      name: 'growax_logs_seller_created_idx',
    }).catch(() => {});
    await queryInterface.addIndex('growax_message_logs', ['seller_id', 'order_id', 'event_key'], {
      name: 'growax_logs_idempotency_idx',
    }).catch(() => {});
    await queryInterface.addIndex('growax_message_logs', ['awb'], {
      name: 'growax_logs_awb_idx',
    }).catch(() => {});
    await queryInterface.addIndex('growax_message_logs', ['status'], {
      name: 'growax_logs_status_idx',
    }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('growax_message_logs').catch(() => {});
    await queryInterface.dropTable('growax_templates').catch(() => {});
    await queryInterface.dropTable('growax_integrations').catch(() => {});
  },
};
