const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET api/beds/wards
// @desc    Get all wards
router.get('/wards', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM wards');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving wards' });
  }
});

// @route   GET api/beds/available
// @desc    Get all available beds
router.get('/available', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.bed_id, b.bed_number, w.ward_name 
       FROM beds b
       JOIN wards w ON b.ward_id = w.ward_id
       WHERE b.status = 'Available'
       ORDER BY w.ward_name, b.bed_number`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving available beds' });
  }
});

// @route   GET api/beds/status
// @desc    Get all beds grouped by ward with active patient details (if occupied)
router.get('/status', auth, async (req, res) => {
  try {
    // Get all beds
    const [beds] = await db.query(
      `SELECT b.bed_id, b.bed_number, b.status, b.ward_id, w.ward_name
       FROM beds b
       JOIN wards w ON b.ward_id = w.ward_id
       ORDER BY w.ward_id, b.bed_number`
    );

    // Get active admissions to link patient details to occupied beds
    const [admissions] = await db.query(
      `SELECT a.admission_id, a.patient_id, a.bed_id, p.full_name as patient_name,
              a.diagnosis, d.full_name as doctor_name
       FROM ipd_admissions a
       JOIN patients p ON a.patient_id = p.patient_id
       JOIN doctors d ON a.attending_doctor = d.doctor_id
       WHERE a.status = 'Admitted'`
    );

    // Map admissions by bed_id for quick O(1) lookup
    const admissionMap = {};
    admissions.forEach(adm => {
      admissionMap[adm.bed_id] = adm;
    });

    // Merge patient details into occupied beds
    const bedsWithDetails = beds.map(bed => {
      if (bed.status === 'Occupied' && admissionMap[bed.bed_id]) {
        return {
          ...bed,
          patient: admissionMap[bed.bed_id]
        };
      }
      return bed;
    });

    res.json(bedsWithDetails);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving bed status layout' });
  }
});

module.exports = router;
