const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST api/ipd/admit
// @desc    Admit a patient (IPD) - Trigger handles bed status update to Occupied
router.post('/admit', auth, async (req, res) => {
  const { patient_id, bed_id, diagnosis, attending_doctor } = req.body;

  if (!patient_id || !bed_id || !attending_doctor) {
    return res.status(400).json({ message: 'Patient ID, Bed, and Attending Doctor are required' });
  }

  try {
    // Check if bed is available
    const [bedRows] = await db.query('SELECT status FROM beds WHERE bed_id = ?', [bed_id]);
    if (bedRows.length === 0) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    if (bedRows[0].status !== 'Available') {
      return res.status(400).json({ message: 'Selected bed is not available' });
    }

    // Check if patient exists and is marked as IPD
    const [patRows] = await db.query('SELECT patient_type FROM patients WHERE patient_id = ?', [patient_id]);
    if (patRows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    // Auto-update patient type to IPD if they were OPD
    if (patRows[0].patient_type !== 'IPD') {
      await db.query("UPDATE patients SET patient_type = 'IPD' WHERE patient_id = ?", [patient_id]);
    }

    // Insert admission
    const [result] = await db.query(
      `INSERT INTO ipd_admissions (patient_id, bed_id, diagnosis, attending_doctor, status)
       VALUES (?, ?, ?, ?, 'Admitted')`,
      [patient_id, bed_id, diagnosis || null, attending_doctor]
    );

    res.status(201).json({
      message: 'Patient admitted successfully',
      admission_id: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during admission' });
  }
});

// @route   PUT api/ipd/discharge/:admission_id
// @desc    Discharge a patient - Trigger handles bed status update to Available
router.put('/discharge/:admission_id', auth, async (req, res) => {
  const admissionId = req.params.admission_id;

  try {
    // Check if admission exists and is active
    const [admRows] = await db.query('SELECT * FROM ipd_admissions WHERE admission_id = ?', [admissionId]);
    if (admRows.length === 0) {
      return res.status(404).json({ message: 'Admission record not found' });
    }
    if (admRows[0].status === 'Discharged') {
      return res.status(400).json({ message: 'Patient is already discharged' });
    }

    // Update admission record
    await db.query(
      `UPDATE ipd_admissions 
       SET status = 'Discharged', discharge_date = CURRENT_TIMESTAMP 
       WHERE admission_id = ?`,
      [admissionId]
    );

    res.json({ message: 'Patient discharged successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during discharge' });
  }
});

// @route   GET api/ipd/active
// @desc    Get all active IPD admissions (optional filter by doctor_id)
router.get('/active', auth, async (req, res) => {
  const { doctor_id } = req.query;
  try {
    let sql = `
      SELECT a.admission_id, a.patient_id, p.full_name as patient_name, p.phone,
             b.bed_number, w.ward_name, a.admission_date, a.diagnosis, d.full_name as doctor_name
      FROM ipd_admissions a
      JOIN patients p ON a.patient_id = p.patient_id
      JOIN beds b ON a.bed_id = b.bed_id
      JOIN wards w ON b.ward_id = w.ward_id
      JOIN doctors d ON a.attending_doctor = d.doctor_id
      WHERE a.status = 'Admitted'
    `;
    const params = [];
    if (doctor_id) {
      sql += ' AND a.attending_doctor = ? ';
      params.push(doctor_id);
    }
    sql += ' ORDER BY a.admission_date DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving active admissions' });
  }
});

module.exports = router;

