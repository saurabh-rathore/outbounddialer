const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// Define campaign CRUD routes
router.post('/', campaignController.createCampaign);
router.get('/', campaignController.getAllCampaigns);
router.get('/:id', campaignController.getCampaignById);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

// Define campaign state management routes
router.put('/:id/start', campaignController.startCampaign);
router.put('/:id/pause', campaignController.pauseCampaign);
router.put('/:id/stop', campaignController.stopCampaign);

// Define campaign stats route
router.get('/:id/stats', campaignController.getCampaignStats);

module.exports = router;
