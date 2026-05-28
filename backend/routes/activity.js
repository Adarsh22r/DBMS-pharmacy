const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET api/activity/recent
// @desc    Get last 10 combined activity events (admissions + dispatches)
router.get('/recent', auth, auth.requireRole('Admin'), async (req, res) => {
  try {
    const [recentAdmissions] = await db.query(
      `SELECT 'Admission' as type, p.full_name as patient_name, a.admission_date as timestamp, a.diagnosis as detail
       FROM ipd_admissions a
       JOIN patients p ON a.patient_id = p.patient_id
       ORDER BY a.admission_date DESC LIMIT 10`
    );

    const [recentDispatches] = await db.query(
      `SELECT 'Dispatch' as type, p.full_name as patient_name, d.dispatch_date as timestamp, m.medicine_name as detail
       FROM dispatch d
       JOIN patients p ON d.patient_id = p.patient_id
       JOIN medicines m ON d.medicine_id = m.medicine_id
       ORDER BY d.dispatch_date DESC LIMIT 10`
    );

    const activities = [...recentAdmissions, ...recentDispatches]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json(activities);
  } catch (error) {
    console.error('Recent activity query error:', error);
    res.status(500).json({ message: 'Server error retrieving recent activity' });
  }
});

module.exports = router;
