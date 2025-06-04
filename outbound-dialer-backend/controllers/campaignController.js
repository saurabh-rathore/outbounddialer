const Campaign = require('../models/Campaign');

// Define MAX_RETRIES, consistent with campaignProcessor.js
const MAX_RETRIES = 3;

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const newCampaign = new Campaign(req.body);
    await newCampaign.save();
    res.status(201).json(newCampaign);
  } catch (error) {
    res.status(400).json({ message: 'Error creating campaign', error: error.message });
  }
};

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.status(200).json(campaigns);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
  }
};

// Get a single campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign', error: error.message });
  }
};

// Update a campaign by ID
exports.updateCampaign = async (req, res) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() }, // Explicitly set updatedAt
      { new: true, runValidators: true }
    );
    if (!updatedCampaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.status(200).json(updatedCampaign);
  } catch (error) {
    res.status(400).json({ message: 'Error updating campaign', error: error.message });
  }
};

// Delete a campaign by ID
exports.deleteCampaign = async (req, res) => {
  try {
    const deletedCampaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!deletedCampaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting campaign', error: error.message });
  }
};

// Start a campaign
exports.startCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (campaign.status !== 'idle' && campaign.status !== 'paused') {
      return res.status(400).json({ message: `Campaign cannot be started. Status is '${campaign.status}'.` });
    }
    if (campaign.status === 'idle') {
      campaign.currentIndex = 0;
      campaign.callAttempts = [];
      console.log(`Campaign ${campaign.name} is starting fresh. Progress reset.`);
    }
    campaign.status = 'running';
    await campaign.save();
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error starting campaign', error: error.message });
  }
};

// Pause a campaign
exports.pauseCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (campaign.status !== 'running') {
      return res.status(400).json({ message: `Campaign cannot be paused. Status is '${campaign.status}'.` });
    }
    campaign.status = 'paused';
    await campaign.save();
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error pausing campaign', error: error.message });
  }
};

// Stop a campaign (set to idle)
exports.stopCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (campaign.status !== 'running' && campaign.status !== 'paused') {
      return res.status(400).json({ message: `Campaign cannot be stopped. Status is '${campaign.status}'.` });
    }
    campaign.status = 'idle';
    await campaign.save();
    res.status(200).json(campaign);
  } catch (error) {
    res.status(500).json({ message: 'Error stopping campaign', error: error.message });
  }
};

// Get campaign statistics
exports.getCampaignStats = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const totalNumbers = campaign.phoneNumbers.length;

    // Processed numbers: count of unique phone numbers in callAttempts that are not 'dnd_blocked' by initial DND check
    // This interpretation might vary. If "processed" means any interaction, DND_blocked could be included.
    // For now, let's say "processed" means an actual dial attempt was made or intended.
    const attemptedPhoneNumbers = new Set(campaign.callAttempts.map(attempt => attempt.phoneNumber));
    const processedNumbers = attemptedPhoneNumbers.size;

    const successfulCalls = campaign.callAttempts.filter(a => a.status === 'success').length;

    const failedCalls = campaign.callAttempts.filter(a =>
      a.status === 'busy' || a.status === 'no_answer' || a.status === 'failed_retry'
    ).length;

    const pendingRetries = campaign.callAttempts.filter(a =>
      a.status === 'pending' && a.retryCount < MAX_RETRIES
    ).length;

    const dndBlockedCalls = campaign.callAttempts.filter(a => a.status === 'dnd_blocked').length;

    res.status(200).json({
      totalNumbers,
      processedNumbers, // Numbers that have at least one call attempt recorded
      successfulCalls,
      failedCalls, // Terminal failures + busy/no_answer that might become pending
      pendingRetries, // Currently in queue for retry
      dndBlockedCalls, // Numbers that were blocked by DND
      currentIndex: campaign.currentIndex, // For additional context on progress
      campaignStatus: campaign.status
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching campaign stats', error: error.message });
  }
};
