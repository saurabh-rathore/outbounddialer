'use strict';

const { Campaign, CallAttempt, sequelize } = require('../models'); // Sequelize way
const { Op } = require('sequelize'); // For operators

const MAX_RETRIES_STATS = 3; // For getCampaignStats, ideally from a shared config later

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const { name, dialPlanId, phoneNumbers, dndList, startDate, endDate, startTime, endTime, status } = req.body;
    const newCampaign = await Campaign.create({
      name,
      dialPlanId,
      phoneNumbers: phoneNumbers || [], // Ensure JSON fields have defaults
      dndList: dndList || [],
      startDate,
      endDate,
      startTime,
      endTime,
      status: status || 'idle'
      // currentIndex is defaulted by the model
    });
    res.status(201).json(newCampaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error creating campaign', error: error.message });
  }
};

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      order: [['createdAt', 'DESC']] // Optional: order by creation date
    });
    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
  }
};

// Get a single campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id, {
      include: [{ model: CallAttempt, as: 'callAttempts', attributes: { exclude: ['campaignId'] } }] // Eager load call attempts
    });
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.status(200).json(campaign);
  } catch (error) {
    console.error('Error fetching campaign by ID:', error);
    res.status(500).json({ message: 'Error fetching campaign by ID', error: error.message });
  }
};

// Update a campaign by ID
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    // Exclude callAttempts and other sensitive fields from direct update via this endpoint
    const { callAttempts, currentIndex, id, createdAt, updatedAt, ...updateData } = req.body;

    // Ensure phoneNumbers and dndList are arrays if provided, otherwise keep existing
    if (updateData.hasOwnProperty('phoneNumbers') && !Array.isArray(updateData.phoneNumbers)) {
        return res.status(400).json({ message: 'Validation Error', errors: ['phoneNumbers must be an array.'] });
    }
    if (updateData.hasOwnProperty('dndList') && !Array.isArray(updateData.dndList)) {
        return res.status(400).json({ message: 'Validation Error', errors: ['dndList must be an array.'] });
    }

    const updatedCampaign = await campaign.update(updateData);
    res.status(200).json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: 'Error updating campaign', error: error.message });
  }
};

// Delete a campaign by ID
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    // onDelete: 'CASCADE' in migration for CallAttempts should handle associated deletions
    await campaign.destroy();
    res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Error deleting campaign', error: error.message });
  }
};

// Start a campaign
exports.startCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status === 'running') {
      return res.status(400).json({ message: 'Campaign is already running.' });
    }
    if (campaign.status === 'completed' || campaign.status === 'archived') { // Added archived check
      return res.status(400).json({ message: `Campaign is ${campaign.status} and cannot be started.` });
    }

    const oldStatus = campaign.status;
    campaign.status = 'running';

    if (oldStatus === 'idle') {
      campaign.currentIndex = 0;
      // Clear previous call attempts if starting fresh from 'idle'
      await CallAttempt.destroy({ where: { campaignId: campaign.id } });
      console.log(`Campaign ${campaign.name} is starting fresh. Progress and call attempts reset.`);
    }
    // For 'paused' status, it just resumes. currentIndex and callAttempts are preserved.

    await campaign.save();
    res.status(200).json(campaign);
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ message: 'Error starting campaign', error: error.message });
  }
};

// Pause a campaign
exports.pauseCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (campaign.status !== 'running') {
      return res.status(400).json({ message: 'Campaign is not running, cannot be paused.' });
    }
    campaign.status = 'paused';
    await campaign.save();
    res.status(200).json(campaign);
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({ message: 'Error pausing campaign', error: error.message });
  }
};

// Stop a campaign (set to idle)
exports.stopCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (campaign.status !== 'running' && campaign.status !== 'paused') {
      return res.status(400).json({ message: 'Campaign is not active, cannot be stopped.' });
    }
    campaign.status = 'idle';
    // Current thinking: stopping an active campaign sets it to idle.
    // It can be restarted (from where it left off if paused, or from beginning if start logic dictates).
    // If it's truly "finished", processor should set it to "completed".
    await campaign.save();
    res.status(200).json(campaign);
  } catch (error) {
    console.error('Error stopping campaign:', error);
    res.status(500).json({ message: 'Error stopping campaign', error: error.message });
  }
};

// Get campaign statistics
exports.getCampaignStats = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const campaign = await Campaign.findByPk(campaignId);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const totalNumbers = campaign.phoneNumbers ? campaign.phoneNumbers.length : 0;

    const processedCallAttempts = await CallAttempt.findAll({
        where: { campaignId: campaignId },
        attributes: ['phoneNumber', 'status', 'retryCount'] // Only fetch necessary fields
    });

    const uniqueProcessedNumbers = new Set(processedCallAttempts.map(att => att.phoneNumber));
    const processedNumbers = uniqueProcessedNumbers.size;

    const successfulCalls = processedCallAttempts.filter(a => a.status === 'success').length;

    const failedCalls = processedCallAttempts.filter(a =>
      a.status === 'busy' || a.status === 'no_answer' || a.status === 'failed_retry'
    ).length;

    const pendingRetries = processedCallAttempts.filter(a =>
      a.status === 'pending' && a.retryCount < MAX_RETRIES_STATS
    ).length;

    const dndBlockedCalls = processedCallAttempts.filter(a => a.status === 'dnd_blocked').length;

    res.status(200).json({
      totalNumbers,
      processedNumbers,
      successfulCalls,
      failedCalls,
      pendingRetries,
      dndBlockedCalls,
      currentIndex: campaign.currentIndex,
      campaignStatus: campaign.status
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ message: 'Error fetching campaign stats', error: error.message });
  }
};
