const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST api/patients/register
// @desc    Register a new patient & auto-generate 6-digit Patient ID
router.post('/register', auth, async (req, res) => {
  const { full_name, dob, gender, phone, email, blood_group, address, patient_type } = req.body;

  if (!full_name || !dob || !gender || !phone || !patient_type) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }

  try {
    // Generate sequential 6-digit Patient ID
    const [maxRows] = await db.query('SELECT MAX(patient_id) as maxId FROM patients');
    let nextId = '100001';
    
    if (maxRows[0] && maxRows[0].maxId) {
      const currentMax = parseInt(maxRows[0].maxId, 10);
      nextId = String(currentMax + 1);
    }

    // Check if phone number already registered
    const [dupRows] = await db.query('SELECT * FROM patients WHERE phone = ?', [phone]);
    if (dupRows.length > 0) {
      return res.status(400).json({ 
        message: 'A patient with this phone number is already registered',
        patient: dupRows[0] 
      });
    }

    // Insert patient
    await db.query(
      `INSERT INTO patients 
       (patient_id, full_name, dob, gender, phone, email, blood_group, address, patient_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextId, full_name, dob, gender, phone, email || null, blood_group || null, address || null, patient_type]
    );

    res.status(201).json({
      message: 'Patient registered successfully',
      patient_id: nextId,
      full_name
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during patient registration' });
  }
});

// @route   GET api/patients/search
// @desc    Search patients by name, ID or phone
router.get('/search', auth, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json([]);
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM patients 
       WHERE patient_id = ? OR full_name LIKE ? OR phone LIKE ? 
       LIMIT 10`,
      [q, `%${q}%`, `%${q}%`]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during patient search' });
  }
});

// @route   GET api/patients/:id
// @desc    Get patient by 6-digit ID (including active bed/admission if IPD)
router.get('/:id', auth, async (req, res) => {
  const patientId = req.params.id;

  try {
    const [pRows] = await db.query('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    if (pRows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patient = pRows[0];

    // If patient is IPD, check for active admission and bed info
    if (patient.patient_type === 'IPD') {
      const [admRows] = await db.query(
        `SELECT a.admission_id, a.admission_date, a.diagnosis, a.attending_doctor,
                b.bed_id, b.bed_number, w.ward_id, w.ward_name, d.full_name as doctor_name
         FROM ipd_admissions a
         JOIN beds b ON a.bed_id = b.bed_id
         JOIN wards w ON b.ward_id = w.ward_id
         JOIN doctors d ON a.attending_doctor = d.doctor_id
         WHERE a.patient_id = ? AND a.status = 'Admitted'
         ORDER BY a.admission_date DESC LIMIT 1`,
        [patientId]
      );
      if (admRows.length > 0) {
        patient.admission = admRows[0];
      }
    }

    res.json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving patient' });
  }
});

module.exports = router;
