const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST api/opd/visit
// @desc    Record a new OPD visit
router.post('/visit', auth, async (req, res) => {
  const { patient_id, doctor_id, symptoms, notes } = req.body;

  if (!patient_id || !doctor_id) {
    return res.status(400).json({ message: 'Patient ID and Doctor ID are required' });
  }

  try {
    // Verify patient exists
    const [patRows] = await db.query('SELECT patient_type FROM patients WHERE patient_id = ?', [patient_id]);
    if (patRows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Insert visit
    const [result] = await db.query(
      `INSERT INTO opd_visits (patient_id, doctor_id, symptoms, notes)
       VALUES (?, ?, ?, ?)`,
      [patient_id, doctor_id, symptoms || null, notes || null]
    );

    res.status(201).json({
      message: 'OPD visit recorded successfully',
      visit_id: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during OPD visit registration' });
  }
});

// @route   GET api/opd/today
// @desc    Get today's OPD visits for a doctor
router.get('/today', auth, auth.requireRole('Doctor', 'Admin'), async (req, res) => {
  const { doctor_id } = req.query;
  if (!doctor_id) {
    return res.status(400).json({ message: 'Doctor ID query parameter is required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT v.visit_id, v.patient_id, p.full_name as patient_name,
              v.visit_date, v.symptoms, v.notes
       FROM opd_visits v
       JOIN patients p ON v.patient_id = p.patient_id
       WHERE v.doctor_id = ? AND DATE(v.visit_date) = CURDATE()
       ORDER BY v.visit_date DESC`,
      [doctor_id]
    );
    res.json(rows);
  } catch (error) {
    console.error('OPD today query error:', error);
    res.status(500).json({ message: 'Server error retrieving today\'s OPD visits' });
  }
});

// @route   GET api/opd/visits
// @desc    Get all OPD visits
router.get('/visits', auth, async (req, res) => {

  try {
    const [rows] = await db.query(
      `SELECT v.visit_id, v.patient_id, p.full_name as patient_name,
              v.visit_date, d.full_name as doctor_name, v.symptoms, v.notes
       FROM opd_visits v
       JOIN patients p ON v.patient_id = p.patient_id
       JOIN doctors d ON v.doctor_id = d.doctor_id
       ORDER BY v.visit_date DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving OPD visits' });
  }
});

module.exports = router;
