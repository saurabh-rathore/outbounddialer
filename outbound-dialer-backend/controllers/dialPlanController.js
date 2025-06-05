'use strict';

const { DialPlan } = require('../models');
const { generateConfig } = require('../services/asteriskConfigGenerator');

// Create a new DialPlan
exports.createDialPlan = async (req, res) => {
  try {
    const { name, description, configuration } = req.body;
    if (!name || configuration === undefined) { // Check for configuration presence, even if it's an empty object
      return res.status(400).json({ message: 'Name and configuration are required.' });
    }
    // Basic validation for configuration structure can be added here if needed
    // For example, check if configuration is an object:
    if (typeof configuration !== 'object' || configuration === null) {
        return res.status(400).json({ message: 'Configuration must be an object.'});
    }

    const newDialPlan = await DialPlan.create({ name, description, configuration });
    res.status(201).json(newDialPlan);
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
    }
    console.error('Error creating dial plan:', error);
    res.status(500).json({ message: 'Error creating dial plan', error: error.message });
  }
};

// Get all DialPlans
exports.getAllDialPlans = async (req, res) => {
  try {
    const dialPlans = await DialPlan.findAll({ order: [['name', 'ASC']] });
    res.status(200).json(dialPlans);
  } catch (error) {
    console.error('Error fetching dial plans:', error);
    res.status(500).json({ message: 'Error fetching dial plans', error: error.message });
  }
};

// Get a single DialPlan by ID
exports.getDialPlanById = async (req, res) => {
  try {
    const dialPlan = await DialPlan.findByPk(req.params.id);
    if (!dialPlan) {
      return res.status(404).json({ message: 'Dial plan not found' });
    }
    res.status(200).json(dialPlan);
  } catch (error) {
    console.error('Error fetching dial plan by ID:', error);
    res.status(500).json({ message: 'Error fetching dial plan by ID', error: error.message });
  }
};

// Update a DialPlan by ID
exports.updateDialPlan = async (req, res) => {
  try {
    const dialPlan = await DialPlan.findByPk(req.params.id);
    if (!dialPlan) {
      return res.status(404).json({ message: 'Dial plan not found' });
    }
    const { name, description, configuration } = req.body;

    // Ensure configuration is an object if provided
    if (configuration !== undefined && (typeof configuration !== 'object' || configuration === null)) {
        return res.status(400).json({ message: 'Configuration must be an object.'});
    }

    // Construct updateData carefully to avoid accidentally clearing fields
    // if they are not provided in the request body.
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (configuration !== undefined) updateData.configuration = configuration;


    await dialPlan.update(updateData);
    res.status(200).json(dialPlan);
  } catch (error) {
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
    }
    console.error('Error updating dial plan:', error);
    res.status(500).json({ message: 'Error updating dial plan', error: error.message });
  }
};

// Delete a DialPlan by ID
exports.deleteDialPlan = async (req, res) => {
  try {
    const dialPlan = await DialPlan.findByPk(req.params.id);
    if (!dialPlan) {
      return res.status(404).json({ message: 'Dial plan not found' });
    }
    await dialPlan.destroy();
    res.status(200).json({ message: 'Dial plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting dial plan:', error);
    // Consider if there are related entities that might prevent deletion (e.g., campaigns using it)
    // SequelizeForeignKeyConstraintError for such cases.
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ message: 'Cannot delete dial plan. It may be in use by campaigns.' });
    }
    res.status(500).json({ message: 'Error deleting dial plan', error: error.message });
  }
};

// Generate Asterisk configuration for a DialPlan
exports.generateDialPlanConfig = async (req, res) => {
  try {
    const dialPlan = await DialPlan.findByPk(req.params.id);
    if (!dialPlan) {
      return res.status(404).json({ message: 'Dial plan not found' });
    }

    if (!dialPlan.configuration || typeof dialPlan.configuration !== 'object') {
      // This case should ideally be prevented by validation on create/update
      console.error(`Dial plan ID ${req.params.id} has missing or invalid configuration.`);
      return res.status(500).type('text/plain').send('; Error: Dial plan configuration is missing or invalid in the database.\n');
    }

    const generatedConfig = generateConfig(dialPlan.configuration);

    res.type('text/plain'); // Set Content-Type to text/plain
    res.send(generatedConfig);

  } catch (error) {
    console.error('Error generating dial plan config:', error);
    res.status(500).type('text/plain').send(`; Server error generating dial plan config: ${error.message}\n`);
  }
};
