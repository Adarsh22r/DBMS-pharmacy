const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST api/dispatch
// @desc    Dispatch medicine to a patient (Calls TRANSACTION Stored Procedure)
router.post('/', auth, async (req, res) => {
  const { patient_id, medicine_id, quantity } = req.body;
  const staff_id = req.user.staff_id; // Securely fetched from JWT token

  if (!patient_id || !medicine_id || !quantity) {
    return res.status(400).json({ message: 'Patient ID, Medicine ID, and quantity are required' });
  }

  try {
    // Call the transaction-based stored procedure
    // CALL sp_dispatch_medicine(patient_id, medicine_id, quantity, staff_id)
    await db.query('CALL sp_dispatch_medicine(?, ?, ?, ?)', [
      patient_id,
      medicine_id,
      quantity,
      staff_id
    ]);

    res.json({ message: 'Medicine dispatched successfully' });

  } catch (error) {
    console.error('Dispatch error:', error.message);
    
    // Check if error is from our SIGNAL in SQL
    if (error.sqlState === '45000') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error during medicine dispatch transaction' });
  }
});

// @route   GET api/dispatch/history
// @desc    Get recent dispatches
router.get('/history', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.dispatch_id, d.patient_id, p.full_name as patient_name,
              m.medicine_name, d.quantity, d.dispatch_date, s.full_name as staff_name
       FROM dispatch d
       JOIN patients p ON d.patient_id = p.patient_id
       JOIN medicines m ON d.medicine_id = m.medicine_id
       JOIN staff s ON d.dispatched_by = s.staff_id
       ORDER BY d.dispatch_date DESC LIMIT 50`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving dispatch history' });
  }
});

module.exports = router;
