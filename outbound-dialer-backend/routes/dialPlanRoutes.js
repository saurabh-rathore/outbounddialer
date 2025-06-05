'use strict';

const express = require('express');
const router = express.Router();
const dialPlanController = require('../controllers/dialPlanController');

// Define DialPlan routes
router.post('/', dialPlanController.createDialPlan);
router.get('/', dialPlanController.getAllDialPlans);
router.get('/:id', dialPlanController.getDialPlanById);
router.put('/:id', dialPlanController.updateDialPlan);
router.delete('/:id', dialPlanController.deleteDialPlan);

// Route for generating Asterisk config
router.get('/:id/generate', dialPlanController.generateDialPlanConfig);

module.exports = router;
