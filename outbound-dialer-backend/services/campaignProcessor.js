const Campaign = require('../models/Campaign');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60000; // 1 minute
const CALL_SIMULATION_DELAY_MS = 1000; // 1 second delay between simulated calls
const BATCH_SIZE = 5; // Process up to 5 primary numbers per run to avoid long blocking

async function processCampaign(campaign) {
  console.log(`Processing campaign: ${campaign.name} (ID: ${campaign._id}, Status: ${campaign.status})`);

  // 1. Check campaign date/time validity
  const now = new Date();
  if (now < campaign.startDate || now > campaign.endDate) {
    console.log(`Campaign ${campaign.name} is outside its date range.`);
    // Optionally set to 'idle' or 'completed' if past endDate
    if (now > campaign.endDate && campaign.status !== 'completed' && campaign.status !== 'archived') {
        campaign.status = 'completed';
        console.log(`Campaign ${campaign.name} marked as completed due to end date.`);
        await campaign.save();
    }
    return;
  }

  const currentTime = `${('0' + now.getHours()).slice(-2)}:${('0' + now.getMinutes()).slice(-2)}`;
  if (currentTime < campaign.startTime || currentTime > campaign.endTime) {
    console.log(`Campaign ${campaign.name} is outside its time range.`);
    return;
  }

  let campaignModified = false;

  // 2. Process Retries
  const retryAttempts = campaign.callAttempts.filter(attempt =>
    attempt.status === 'pending' &&
    attempt.retryCount < MAX_RETRIES &&
    (Date.now() - attempt.timestamp.getTime()) > RETRY_DELAY_MS
  );

  for (const attempt of retryAttempts) {
    if (campaign.dndList.includes(attempt.phoneNumber)) {
      console.log(`Dialing (retry DND blocked) ${attempt.phoneNumber}`);
      attempt.status = 'dnd_blocked';
      attempt.timestamp = new Date();
      campaignModified = true;
      continue;
    }

    attempt.retryCount += 1;
    attempt.timestamp = new Date();
    // Simulate call outcome
    const randomOutcome = Math.random();
    if (randomOutcome < 0.6) attempt.status = 'success'; // 60% success
    else if (randomOutcome < 0.8) attempt.status = 'busy'; // 20% busy
    else attempt.status = 'no_answer'; // 20% no_answer

    console.log(`Dialing (retry ${attempt.retryCount}) ${attempt.phoneNumber}: ${attempt.status}`);

    if (attempt.status === 'success' || attempt.retryCount >= MAX_RETRIES) {
      if (attempt.status !== 'success') attempt.status = 'failed_retry'; // Mark as failed if max retries reached
    } else {
      attempt.status = 'pending'; // Keep as pending if not success and not max retries
    }
    campaignModified = true;
    await new Promise(resolve => setTimeout(resolve, CALL_SIMULATION_DELAY_MS));
  }

  // 3. Process Primary Numbers (Batch)
  let primaryNumbersProcessedThisRun = 0;
  while (campaign.currentIndex < campaign.phoneNumbers.length && primaryNumbersProcessedThisRun < BATCH_SIZE) {
    const phoneNumber = campaign.phoneNumbers[campaign.currentIndex];

    // Check if already attempted (e.g., from a previous run that was interrupted or if numbers can be duplicated in list)
    const existingAttempt = campaign.callAttempts.find(a => a.phoneNumber === phoneNumber);
    if (existingAttempt && existingAttempt.status !== 'pending') { // If pending, retry logic handles it. If success/failed, skip.
        console.log(`Skipping ${phoneNumber} as it was already processed with status: ${existingAttempt.status}.`);
        campaign.currentIndex += 1;
        campaignModified = true;
        continue;
    }


    if (campaign.dndList.includes(phoneNumber)) {
      console.log(`Dialing (DND blocked) ${phoneNumber}`);
      campaign.callAttempts.push({
        phoneNumber: phoneNumber,
        status: 'dnd_blocked',
        timestamp: new Date(),
        retryCount: 0
      });
      campaign.currentIndex += 1;
      campaignModified = true;
      primaryNumbersProcessedThisRun++;
      continue;
    }

    // Simulate call outcome
    const randomOutcome = Math.random();
    let outcomeStatus;
    if (randomOutcome < 0.6) outcomeStatus = 'success';
    else if (randomOutcome < 0.8) outcomeStatus = 'busy';
    else outcomeStatus = 'no_answer';

    console.log(`Dialing (primary) ${phoneNumber}: ${outcomeStatus}`);

    campaign.callAttempts.push({
      phoneNumber: phoneNumber,
      status: (outcomeStatus === 'success') ? 'success' : 'pending', // If not success, mark for potential retry
      timestamp: new Date(),
      retryCount: (outcomeStatus === 'success') ? 0 : 1 // Start retry count if it's a failure
    });
    campaign.currentIndex += 1;
    campaignModified = true;
    primaryNumbersProcessedThisRun++;
    await new Promise(resolve => setTimeout(resolve, CALL_SIMULATION_DELAY_MS));
  }

  // 4. Check for Campaign Completion
  const allPrimaryProcessed = campaign.currentIndex >= campaign.phoneNumbers.length;
  const noPendingRetries = !campaign.callAttempts.some(a => a.status === 'pending' && a.retryCount < MAX_RETRIES);

  if (allPrimaryProcessed && noPendingRetries) {
    campaign.status = 'completed';
    console.log(`Campaign ${campaign.name} completed.`);
    campaignModified = true;
  }

  if (campaignModified) {
    campaign.updatedAt = new Date(); // Ensure updatedAt is set
    await campaign.save();
    console.log(`Campaign ${campaign.name} saved with updates.`);
  } else {
    console.log(`No changes for campaign ${campaign.name} in this run.`);
  }
}

async function runProcessor() {
  console.log('Campaign processor running...');
  try {
    const runningCampaigns = await Campaign.find({ status: 'running' });
    if (runningCampaigns.length === 0) {
      console.log('No running campaigns to process.');
      return;
    }

    for (const campaign of runningCampaigns) {
      // Wrap processCampaign in a try-catch to prevent one campaign error from stopping others
      try {
        await processCampaign(campaign);
      } catch (error) {
        console.error(`Error processing campaign ${campaign._id}:`, error);
        // Optionally update campaign status to 'paused' or log error to campaign itself
        try {
            campaign.status = 'paused'; // Pause campaign on error
            campaign.callAttempts.push({
                phoneNumber: 'PROCESSOR_ERROR',
                status: 'failed_retry', // Using an existing enum value
                timestamp: new Date(),
                // Could add an 'errorMessage' field to callAttemptSchema later
            });
            await campaign.save();
            console.log(`Campaign ${campaign._id} paused due to processing error.`);
        } catch (saveError) {
            console.error(`Failed to save campaign ${campaign._id} after processing error:`, saveError);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching running campaigns:', error);
  }
  console.log('Campaign processor finished run.');
}

module.exports = { runProcessor, processCampaign }; // Export processCampaign for potential direct use/testing
