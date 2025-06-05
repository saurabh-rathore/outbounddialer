'use strict';

const { Campaign, CallAttempt } = require('../models'); // Sequelize way
const { Op } = require('sequelize'); // For Sequelize operators

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60000; // 1 minute
const CALL_SIMULATION_DELAY_MS = 1000; // 1 second delay between simulated calls
const BATCH_SIZE = 5; // Process up to 5 primary numbers per run

async function processCampaign(campaignInstance) {
  console.log(`Processing campaign: ${campaignInstance.name} (ID: ${campaignInstance.id}, Status: ${campaignInstance.status})`);
  let campaignModified = false;

  // 1. Check campaign date/time validity
  const now = new Date();
  const todayDateOnly = `${now.getFullYear()}-${('0' + (now.getMonth() + 1)).slice(-2)}-${('0' + now.getDate()).slice(-2)}`;

  if (todayDateOnly < campaignInstance.startDate || todayDateOnly > campaignInstance.endDate) {
    console.log(`Campaign ${campaignInstance.name} is outside its date range (${campaignInstance.startDate} to ${campaignInstance.endDate}). Today: ${todayDateOnly}`);
    if (todayDateOnly > campaignInstance.endDate && campaignInstance.status !== 'completed' && campaignInstance.status !== 'archived') {
      campaignInstance.status = 'completed';
      console.log(`Campaign ${campaignInstance.name} marked as completed due to end date.`);
      campaignModified = true;
    }
    // If campaignModified is true, it will be saved at the end. If not, we just return.
    if (!campaignModified) return;
  }

  const currentTime = `${('0' + now.getHours()).slice(-2)}:${('0' + now.getMinutes()).slice(-2)}:00`; // HH:MM:SS format for TIME type
  if (currentTime < campaignInstance.startTime || currentTime > campaignInstance.endTime) {
    console.log(`Campaign ${campaignInstance.name} is outside its time range (${campaignInstance.startTime} to ${campaignInstance.endTime}). Current: ${currentTime}`);
    return; // Don't modify or save if just outside time range for today
  }

  const dndSet = new Set(campaignInstance.dndList || []);

  // 2. Process Retries
  const pendingRetryAttempts = await CallAttempt.findAll({
    where: {
      campaignId: campaignInstance.id,
      status: 'pending',
      retryCount: { [Op.lt]: MAX_RETRIES },
      timestamp: { [Op.lte]: new Date(Date.now() - RETRY_DELAY_MS) }
    },
    limit: BATCH_SIZE
  });

  for (const attempt of pendingRetryAttempts) {
    if (dndSet.has(attempt.phoneNumber)) {
      attempt.status = 'dnd_blocked';
      console.log(`DND blocked (retry) ${attempt.phoneNumber} for campaign ${campaignInstance.name}`);
    } else {
      const outcome = Math.random() < 0.7 ? 'success' : (Math.random() < 0.5 ? 'busy' : 'no_answer');
      console.log(`Dialing (retry ${attempt.retryCount + 1}) ${attempt.phoneNumber} for campaign ${campaignInstance.name}: ${outcome}`);
      attempt.status = outcome;
      if (outcome !== 'success') {
        if (attempt.retryCount + 1 >= MAX_RETRIES) {
          attempt.status = 'failed_retry';
        } else {
          attempt.status = 'pending'; // Stays pending
        }
      }
    }
    attempt.retryCount += 1;
    attempt.timestamp = new Date();
    await attempt.save();
    campaignModified = true;
    await new Promise(resolve => setTimeout(resolve, CALL_SIMULATION_DELAY_MS));
  }

  // 3. Process Primary Numbers (Batch)
  // Ensure phoneNumbers is not null before trying to slice
  const phoneNumbersList = campaignInstance.phoneNumbers || [];
  const numbersToProcess = phoneNumbersList.slice(campaignInstance.currentIndex, campaignInstance.currentIndex + BATCH_SIZE);
  let numbersProcessedInBatch = 0;

  for (const phoneNumber of numbersToProcess) {
    // Check if this number has already been successfully called or terminally failed in a previous attempt for this campaign
    const existingFinalAttempt = await CallAttempt.findOne({
        where: {
            campaignId: campaignInstance.id,
            phoneNumber: phoneNumber,
            status: { [Op.in]: ['success', 'failed_retry', 'dnd_blocked'] }
        }
    });

    if (existingFinalAttempt) {
        console.log(`Skipping ${phoneNumber} as it already has a final status: ${existingFinalAttempt.status}`);
        // This number is considered processed in terms of advancing the main list.
    } else if (dndSet.has(phoneNumber)) {
      console.log(`DND blocked ${phoneNumber} for campaign ${campaignInstance.name}`);
      await CallAttempt.create({
        campaignId: campaignInstance.id,
        phoneNumber: phoneNumber,
        status: 'dnd_blocked',
        retryCount: 0,
        timestamp: new Date()
      });
      campaignModified = true;
    } else {
      const outcome = Math.random() < 0.7 ? 'success' : (Math.random() < 0.5 ? 'busy' : 'no_answer');
      console.log(`Dialing (primary) ${phoneNumber} for campaign ${campaignInstance.name}: ${outcome}`);
      await CallAttempt.create({
        campaignId: campaignInstance.id,
        phoneNumber: phoneNumber,
        status: outcome === 'success' ? 'success' : 'pending',
        retryCount: 0, // Initial attempt for primary numbers
        timestamp: new Date()
      });
      campaignModified = true;
    }
    numbersProcessedInBatch++; // Increment for every number considered from the slice
    await new Promise(resolve => setTimeout(resolve, CALL_SIMULATION_DELAY_MS));
  }

  if (numbersProcessedInBatch > 0) {
    campaignInstance.currentIndex += numbersProcessedInBatch;
    campaignModified = true;
  }

  // 4. Check for Campaign Completion
  const remainingPrimaryNumbers = phoneNumbersList.length - campaignInstance.currentIndex;
  const newPendingRetriesCount = await CallAttempt.count({
    where: {
      campaignId: campaignInstance.id,
      status: 'pending',
      retryCount: { [Op.lt]: MAX_RETRIES }
    }
  });

  if (remainingPrimaryNumbers <= 0 && newPendingRetriesCount === 0) {
    campaignInstance.status = 'completed';
    console.log(`Campaign ${campaignInstance.name} (ID: ${campaignInstance.id}) marked as completed.`);
    campaignModified = true;
  }

  if (campaignModified) {
    await campaignInstance.save();
    console.log(`Campaign ${campaignInstance.name} (ID: ${campaignInstance.id}) saved with updates.`);
  } else {
    console.log(`No changes requiring save for campaign ${campaignInstance.name} (ID: ${campaignInstance.id}) in this run.`);
  }
}

async function runProcessor() {
  console.log(`Campaign processor cycle started at ${new Date().toISOString()}`);
  try {
    const runningCampaigns = await Campaign.findAll({
      where: { status: 'running' }
    });

    if (runningCampaigns.length === 0) {
      console.log('No running campaigns to process in this cycle.');
    } else {
      console.log(`Found ${runningCampaigns.length} running campaign(s). Processing...`);
      for (const campaign of runningCampaigns) {
        try {
          await processCampaign(campaign);
        } catch (campaignError) {
          console.error(`Error processing campaign ID ${campaign.id} (${campaign.name}):`, campaignError);
          try {
            campaign.status = 'paused'; // Pause campaign on error
            await campaign.save();
            console.log(`Campaign ID ${campaign.id} (${campaign.name}) paused due to processing error.`);
          } catch (saveError) {
            console.error(`Failed to pause campaign ID ${campaign.id} after error:`, saveError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in campaign processor main loop:', error);
  }
  console.log(`Campaign processor cycle finished at ${new Date().toISOString()}`);
}

module.exports = { runProcessor };
