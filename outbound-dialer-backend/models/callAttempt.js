'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CallAttempt extends Model {
    static associate(models) {
      // Define associations here
      CallAttempt.belongsTo(models.Campaign, {
        foreignKey: 'campaignId',
        as: 'campaign', // Alias for the association
        allowNull: false // campaignId cannot be null
      });
    }
  }
  CallAttempt.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    // campaignId will be added by Sequelize through the association defined above.
    // It's good practice to also define it in the migration for explicit schema control.
    phoneNumber: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(50), // e.g., 'success', 'busy', 'no_answer', 'pending', 'failed_retry', 'dnd_blocked'
      allowNull: false
    },
    timestamp: { // Timestamp of this specific attempt
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
    // Timestamps (createdAt, updatedAt) are handled by Sequelize by default
  }, {
    sequelize,
    modelName: 'CallAttempt',
    // tableName: 'CallAttempts'
    // timestamps: true
  });
  return CallAttempt;
};
