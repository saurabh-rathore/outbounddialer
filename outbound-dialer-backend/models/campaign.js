'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Campaign extends Model {
    static associate(models) {
      // Define associations here
      Campaign.hasMany(models.CallAttempt, {
        foreignKey: 'campaignId',
        as: 'callAttempts' // Alias for the association
      });
    }
  }
  Campaign.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dialPlanId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phoneNumbers: {
      type: DataTypes.JSON, // Assumes MySQL supports JSON type
      allowNull: false,
      defaultValue: []
    },
    dndList: {
      type: DataTypes.JSON, // Assumes MySQL supports JSON type
      allowNull: false,
      defaultValue: []
    },
    startDate: {
      type: DataTypes.DATEONLY, // Stores only the date part
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATEONLY, // Stores only the date part
      allowNull: false
    },
    startTime: {
      type: DataTypes.TIME, // Stores only the time part
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME, // Stores only the time part
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'idle' // Valid statuses: 'idle', 'running', 'paused', 'completed', 'archived', 'error'
    },
    currentIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
    // Timestamps (createdAt, updatedAt) are handled by Sequelize by default
  }, {
    sequelize,
    modelName: 'Campaign',
    // tableName: 'Campaigns' // Optionally specify table name
    // timestamps: true // Default is true
  });
  return Campaign;
};
