const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Use promise-based wrapper
const promisePool = pool.promise();

// Simple check query to confirm database connection
promisePool.query('SELECT 1')
  .then(() => {
    console.log('Successfully connected to MySQL database: ' + process.env.DB_NAME);
  })
  .catch(err => {
    console.error('MySQL connection error:', err);
    process.exit(1);
  });

module.exports = promisePool;
