const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST api/prescriptions
// @desc    Create a new prescription with items
router.post('/', auth, async (req, res) => {
  const { patient_id, doctor_id, notes, items } = req.body;

  if (!patient_id || !doctor_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Patient ID, Doctor ID, and prescription items are required' });
  }

  // Create Connection from pool to wrap inside a Node-level Transaction
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Insert main prescription
    const [result] = await conn.query(
      'INSERT INTO prescriptions (patient_id, doctor_id, notes) VALUES (?, ?, ?)',
      [patient_id, doctor_id, notes || null]
    );
    const prescriptionId = result.insertId;

    // Insert prescription items
    for (const item of items) {
      const { medicine_id, dosage, quantity, frequency, duration_days } = item;
      if (!medicine_id || !quantity) {
        throw new Error('Medicine ID and quantity are required for all items');
      }

      await conn.query(
        `INSERT INTO prescription_items 
         (prescription_id, medicine_id, dosage, quantity, frequency, duration_days) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [prescriptionId, medicine_id, dosage || null, quantity, frequency || null, duration_days || null]
      );
    }

    await conn.commit();
    res.status(201).json({
      message: 'Prescription created successfully',
      prescription_id: prescriptionId
    });

  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error creating prescription' });
  } finally {
    conn.release();
  }
});

// @route   GET api/prescriptions/patient/:patient_id
// @desc    Get patient prescriptions calling stored procedure sp_get_prescription
router.get('/patient/:patient_id', auth, async (req, res) => {
  const patientId = req.params.patient_id;

  try {
    // Call MySQL Stored Procedure
    const [rows] = await db.query('CALL sp_get_prescription(?)', [patientId]);
    
    // Stored procedure returns array of arrays. The first element is the rows list.
    res.json(rows[0] || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving patient prescription' });
  }
});

module.exports = router;
