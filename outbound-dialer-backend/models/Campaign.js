const mongoose = require('mongoose');

const callAttemptSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['success', 'busy', 'no_answer', 'failed_retry', 'pending', 'dnd_blocked'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  retryCount: { type: Number, default: 0 }
});

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  dialPlanId: { type: String, trim: true },
  phoneNumbers: [{ type: String, trim: true }],
  dndList: [{ type: String, trim: true }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startTime: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/  // HH:MM format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/  // HH:MM format
  },
  status: {
    type: String,
    enum: ['idle', 'running', 'paused', 'completed', 'archived'],
    default: 'idle'
  },
  currentIndex: { type: Number, default: 0 }, // Keeps track of the next number to dial from phoneNumbers
  callAttempts: [callAttemptSchema], // Array of call attempt objects
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to update `updatedAt`
campaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
