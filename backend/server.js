const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database Connection Check (Initializes the pool connection check)
require('./config/db');

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MediCare Pro API is running smoothly' });
});

// Register API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/beds', require('./routes/beds'));
app.use('/api/ipd', require('./routes/ipd'));
app.use('/api/opd', require('./routes/opd'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/dispatch', require('./routes/dispatch'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/activity', require('./routes/activity'));


// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
