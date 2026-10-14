'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Create coupons table
    await queryInterface.createTable('coupons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      benefit_type: {
        type: Sequelize.ENUM('bonus_credit', 'discount'),
        allowNull: false,
        defaultValue: 'bonus_credit',
      },
      discount_type: {
        type: Sequelize.ENUM('percentage', 'flat'),
        allowNull: false,
        defaultValue: 'percentage',
      },
      discount_value: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      min_recharge_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      max_discount_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      valid_from: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      valid_until: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      usage_limit_total: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      usage_limit_per_user: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      used_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Indexes for coupons
    await queryInterface.addIndex('coupons', ['code'], { unique: true });
    await queryInterface.addIndex('coupons', ['is_active']);

    // 2. Create coupon_usages table
    await queryInterface.createTable('coupon_usages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      coupon_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'coupons', key: 'id' },
        onDelete: 'CASCADE',
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      recharge_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      recharge_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      benefit_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      benefit_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('coupon_usages', ['coupon_id']);
    await queryInterface.addIndex('coupon_usages', ['tenant_id', 'coupon_id']);

    // 3. Add columns to wallet_recharge_transactions if not existing
    const tableDesc = await queryInterface.describeTable('wallet_recharge_transactions');
    if (!tableDesc.coupon_id) {
      await queryInterface.addColumn('wallet_recharge_transactions', 'coupon_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }
    if (!tableDesc.coupon_code) {
      await queryInterface.addColumn('wallet_recharge_transactions', 'coupon_code', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    }
    if (!tableDesc.coupon_benefit_amount) {
      await queryInterface.addColumn('wallet_recharge_transactions', 'coupon_benefit_amount', {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      });
    }
    if (!tableDesc.coupon_benefit_type) {
      await queryInterface.addColumn('wallet_recharge_transactions', 'coupon_benefit_type', {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('coupon_usages');
    await queryInterface.dropTable('coupons');
  },
};
