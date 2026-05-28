const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET api/stock
// @desc    Get all medicines and their current stock levels
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.medicine_id, m.medicine_name, m.category, m.manufacturer, m.unit_price, m.unit,
              s.stock_id, s.batch_number, IFNULL(s.quantity, 0) as quantity, s.expiry_date, s.reorder_level
       FROM medicines m
       LEFT JOIN stock s ON m.medicine_id = s.medicine_id
       ORDER BY m.medicine_name ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving stock' });
  }
});

// @route   GET api/stock/low
// @desc    Get low stock alerts (Calls CURSOR Stored Procedure)
router.get('/low', auth, auth.requireRole('Admin', 'Pharmacist'), async (req, res) => {
  try {
    // Call the cursor-based stored procedure
    const [rows] = await db.query('CALL sp_low_stock_report()');
    
    // Stored procedure returns array of arrays. The first element is the rows list.
    res.json(rows[0] || []);
  } catch (error) {
    console.error('Low stock report error:', error);
    res.status(500).json({ message: 'Server error generating low stock report' });
  }
});

// @route   GET api/stock/expiring
// @desc    Get stock batches expiring within N days
router.get('/expiring', auth, auth.requireRole('Admin', 'Pharmacist'), async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days, 10) : 30;
  try {
    const [rows] = await db.query(
      `SELECT s.stock_id, m.medicine_name, s.batch_number, s.quantity, s.expiry_date
       FROM stock s
       JOIN medicines m ON s.medicine_id = m.medicine_id
       WHERE s.quantity > 0 
         AND s.expiry_date > CURDATE()
         AND s.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY s.expiry_date ASC`,
      [days]
    );
    res.json(rows);
  } catch (error) {
    console.error('Expiring stock query error:', error);
    res.status(500).json({ message: 'Server error retrieving expiring stock' });
  }
});

// @route   POST api/stock/add-medicine
// @desc    Create a new medicine and initialize its stock
router.post('/add-medicine', auth, auth.requireRole('Admin', 'Pharmacist'), async (req, res) => {
  const { medicine_name, category, manufacturer, unit_price, unit, batch_number, quantity, expiry_date, reorder_level } = req.body;

  if (!medicine_name || !unit_price || !unit || !batch_number || !expiry_date) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert medicine
    const [medResult] = await conn.query(
      `INSERT INTO medicines (medicine_name, category, manufacturer, unit_price, unit)
       VALUES (?, ?, ?, ?, ?)`,
      [medicine_name, category || null, manufacturer || null, unit_price, unit]
    );
    const medicineId = medResult.insertId;

    // 2. Insert stock
    const qty = quantity ? parseInt(quantity, 10) : 0;
    const [stockResult] = await conn.query(
      `INSERT INTO stock (medicine_id, batch_number, quantity, expiry_date, reorder_level)
       VALUES (?, ?, ?, ?, ?)`,
      [medicineId, batch_number, qty, expiry_date, reorder_level || 50]
    );
    const stockId = stockResult.insertId;

    // 3. Log stock in (Audit trail)
    if (qty > 0) {
      await conn.query(
        `INSERT INTO stock_log (medicine_id, change_type, quantity, reason, batch_stock_id)
         VALUES (?, 'IN', ?, 'Initial stock intake', ?)`,
        [medicineId, qty, stockId]
      );
    }

    await conn.commit();
    res.status(201).json({
      message: 'Medicine and stock initialized successfully',
      medicine_id: medicineId
    });

  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error initializing medicine stock' });
  } finally {
    conn.release();
  }
});

// @route   POST api/stock/restock
// @desc    Restock an existing medicine quantity
router.post('/restock', auth, auth.requireRole('Admin', 'Pharmacist'), async (req, res) => {
  const { medicine_id, quantity, batch_number, expiry_date } = req.body;

  if (!medicine_id || !quantity || quantity <= 0 || !batch_number || !expiry_date) {
    return res.status(400).json({ message: 'Medicine ID, quantity, batch number, and expiry date are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check if stock record exists for this medicine and batch_number
    const [stockRows] = await conn.query(
      'SELECT stock_id FROM stock WHERE medicine_id = ? AND batch_number = ?',
      [medicine_id, batch_number]
    );
    
    let stockId;
    if (stockRows.length === 0) {
      // Create new stock batch row
      const [insertResult] = await conn.query(
        `INSERT INTO stock (medicine_id, batch_number, quantity, expiry_date, reorder_level)
         VALUES (?, ?, ?, ?, 50)`,
        [medicine_id, batch_number, quantity, expiry_date]
      );
      stockId = insertResult.insertId;
    } else {
      // Update existing stock batch row
      stockId = stockRows[0].stock_id;
      await conn.query(
        'UPDATE stock SET quantity = quantity + ? WHERE stock_id = ?',
        [quantity, stockId]
      );
    }

    // Log the action to stock_log with batch_stock_id
    await conn.query(
      `INSERT INTO stock_log (medicine_id, change_type, quantity, reason, batch_stock_id)
       VALUES (?, 'IN', ?, 'Manual Restock', ?)`,
      [medicine_id, quantity, stockId]
    );

    await conn.commit();
    res.json({ message: 'Medicine stock updated successfully' });

  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error updating stock' });
  } finally {
    conn.release();
  }
});

// @route   GET api/stock/logs
// @desc    Get stock transaction logs (audit trail)
router.get('/logs', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.log_id, m.medicine_name, l.change_type, l.quantity, l.reason, l.log_time, s.batch_number
       FROM stock_log l
       JOIN medicines m ON l.medicine_id = m.medicine_id
       LEFT JOIN stock s ON l.batch_stock_id = s.stock_id
       ORDER BY l.log_time DESC LIMIT 100`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving stock logs' });
  }
});

module.exports = router;

