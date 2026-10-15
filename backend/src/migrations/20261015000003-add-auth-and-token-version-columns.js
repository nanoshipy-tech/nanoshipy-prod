'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. platform_admins: add token_version and custom_role_id
    const adminDesc = await queryInterface.describeTable('platform_admins').catch(() => ({}));
    if (!adminDesc.token_version) {
      await queryInterface.addColumn('platform_admins', 'token_version', {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      }).catch(() => {});
    }
    if (!adminDesc.custom_role_id) {
      await queryInterface.addColumn('platform_admins', 'custom_role_id', {
        type: Sequelize.UUID,
        allowNull: true,
      }).catch(() => {});
    }

    // 2. users: add token_version and avatar_url
    const userDesc = await queryInterface.describeTable('users').catch(() => ({}));
    if (!userDesc.token_version) {
      await queryInterface.addColumn('users', 'token_version', {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      }).catch(() => {});
    }
    if (!userDesc.avatar_url) {
      await queryInterface.addColumn('users', 'avatar_url', {
        type: Sequelize.TEXT,
        allowNull: true,
      }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    const adminDesc = await queryInterface.describeTable('platform_admins').catch(() => ({}));
    if (adminDesc.token_version) await queryInterface.removeColumn('platform_admins', 'token_version');
    if (adminDesc.custom_role_id) await queryInterface.removeColumn('platform_admins', 'custom_role_id');

    const userDesc = await queryInterface.describeTable('users').catch(() => ({}));
    if (userDesc.token_version) await queryInterface.removeColumn('users', 'token_version');
    if (userDesc.avatar_url) await queryInterface.removeColumn('users', 'avatar_url');
  },
};
