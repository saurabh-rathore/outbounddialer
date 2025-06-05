const express = require('express');
const bodyParser = require('body-parser');
// const mongoose = require('mongoose'); // Removed Mongoose

// Require campaign routes
const campaignRoutes = require('./routes/campaignRoutes');
// Require dial plan routes
const dialPlanRoutes = require('./routes/dialPlanRoutes');
// Require the campaign processor
const { runProcessor } = require('./services/campaignProcessor');

// Require Sequelize setup (models/index.js)
const db = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;
const PROCESSOR_INTERVAL_MS = 10000; // Processor interval

// Middleware
app.use(bodyParser.json());

// Removed MongoDB Connection Block
// const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/outbound_dialer_db';
// mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => {
//     console.log('MongoDB connected successfully.');
//     // Start the campaign processor after DB connection is successful
//     // setInterval(runProcessor, PROCESSOR_INTERVAL_MS); // Commented out processor
//     // console.log(`Campaign processor scheduled to run every ${PROCESSOR_INTERVAL_MS / 1000} seconds.`);
//   })
//   .catch(err => console.error('MongoDB connection error:', err));

// Root route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Mount campaign routes
// Note: campaignRoutes still uses the Mongoose Campaign model. This will be addressed in next subtask.
// For now, server start and DB connection test is the goal. API routes will error if hit.
app.use('/api/campaigns', campaignRoutes);
app.use('/api/dialplans', dialPlanRoutes); // Mount dial plan routes

// Test MySQL Database Connection and Start Server
db.sequelize.authenticate()
  .then(() => {
    console.log('MySQL connection has been established successfully.');
    // Start the server only after DB connection is successful
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
      // Schedule the campaign processor to run
      setInterval(runProcessor, PROCESSOR_INTERVAL_MS);
      console.log(`Campaign processor scheduled to run every ${PROCESSOR_INTERVAL_MS / 1000} seconds.`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the MySQL database:', err);
    // Exit the process if DB connection fails, as the app cannot run
    process.exit(1);
  });

// Old server start, now moved into sequelize.authenticate().then()
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
