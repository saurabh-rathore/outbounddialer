'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DialPlans', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      configuration: {
        type: Sequelize.JSON,
        allowNull: false,
        // Default value for JSON in migration is often omitted to rely on model/app logic.
        // If a DB default is needed, it's typically a string: defaultValue: '{}'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    // Optional: Add an index on the name if it's frequently queried
    // await queryInterface.addIndex('DialPlans', ['name']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('DialPlans');
  }
};
