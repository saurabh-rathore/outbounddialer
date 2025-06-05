'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class DialPlan extends Model {
    static associate(models) {
      // Define associations here if any in the future
      // For example, a Campaign might belong to a DialPlan
      // models.Campaign.belongsTo(models.DialPlan, { foreignKey: 'dialPlanId_fk', as: 'dialPlanDetails' });
      // DialPlan.hasMany(models.Campaign, { foreignKey: 'dialPlanId_fk', as: 'campaigns' });
      // For now, we are keeping dialPlanId in Campaign as a simple string/ID,
      // so direct association is not strictly made here yet unless we decide to enforce FK.
      // If we decide to use dialPlanId in Campaign model as a foreign key, it should be:
      // this.hasMany(models.Campaign, {
      //   foreignKey: 'dialPlanId', // This must match the FK name in Campaign model
      //   as: 'campaigns'
      // });
    }
  }
  DialPlan.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // Assuming dial plan names should be unique
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    configuration: {
      type: DataTypes.JSON, // To store the structured dial plan
      allowNull: false,
      defaultValue: {} // Default to an empty object
    }
    // Timestamps (createdAt, updatedAt) are handled by Sequelize by default
  }, {
    sequelize,
    modelName: 'DialPlan',
    // tableName: 'DialPlans' // Optional: specify table name
  });
  return DialPlan;
};
