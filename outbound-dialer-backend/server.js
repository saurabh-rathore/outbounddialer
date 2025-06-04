const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Require campaign routes
const campaignRoutes = require('./routes/campaignRoutes');
// Require the campaign processor
const { runProcessor } = require('./services/campaignProcessor');

const app = express();
const PORT = process.env.PORT || 3000;
const PROCESSOR_INTERVAL_MS = 10000; // Run processor every 10 seconds

// Middleware
app.use(bodyParser.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/outbound_dialer_db';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully.');
    // Start the campaign processor after DB connection is successful
    setInterval(runProcessor, PROCESSOR_INTERVAL_MS);
    console.log(`Campaign processor scheduled to run every ${PROCESSOR_INTERVAL_MS / 1000} seconds.`);
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Root route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Mount campaign routes
app.use('/api/campaigns', campaignRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
