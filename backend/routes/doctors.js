const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET api/doctors
// @desc    Get all doctors
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM doctors ORDER BY full_name ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving doctors' });
  }
});

// @route   POST api/doctors
// @desc    Add a new doctor
router.post('/', auth, async (req, res) => {
  const { full_name, specialization, phone, email } = req.body;

  if (!full_name || !specialization) {
    return res.status(400).json({ message: 'Please enter doctor name and specialization' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO doctors (full_name, specialization, phone, email) VALUES (?, ?, ?, ?)',
      [full_name, specialization, phone || null, email || null]
    );

    res.status(201).json({
      message: 'Doctor added successfully',
      doctor_id: result.insertId,
      full_name
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding doctor' });
  }
});

module.exports = router;
