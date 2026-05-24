const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   GET api/reports/sales
// @desc    Get monthly sales report by calling sp_sales_report
router.get('/sales', auth, async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
  const month = req.query.month ? parseInt(req.query.month, 10) : (new Date().getMonth() + 1);

  try {
    const [rows] = await db.query('CALL sp_sales_report(?, ?)', [year, month]);
    res.json(rows[0] || []);
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ message: 'Server error generating sales report' });
  }
});

// @route   GET api/reports/dashboard-summary
// @desc    Get KPI metrics for dashboard cards
router.get('/dashboard-summary', auth, async (req, res) => {
  try {
    // 1. Total IPD Admissions active
    const [[{ activeIpd }]] = await db.query(
      "SELECT COUNT(*) as activeIpd FROM ipd_admissions WHERE status = 'Admitted'"
    );

    // 2. Total OPD visits today
    const [[{ opdToday }]] = await db.query(
      "SELECT COUNT(*) as opdToday FROM opd_visits WHERE DATE(visit_date) = CURDATE()"
    );

    // 3. Available beds count
    const [[{ availableBeds }]] = await db.query(
      "SELECT COUNT(*) as availableBeds FROM beds WHERE status = 'Available'"
    );

    // 4. Low stock alerts (items at or below reorder level)
    const [[{ lowStockCount }]] = await db.query(
      "SELECT COUNT(*) as lowStockCount FROM stock WHERE quantity <= reorder_level"
    );

    // 5. Monthly Revenue
    const [[{ monthlyRevenue }]] = await db.query(
      `SELECT IFNULL(SUM(final_amount), 0) as monthlyRevenue 
       FROM bills 
       WHERE YEAR(bill_date) = YEAR(CURDATE()) AND MONTH(bill_date) = MONTH(CURDATE())`
    );

    // 6. Recent activities (combine 3 recent admissions and 3 recent dispatches)
    const [recentAdmissions] = await db.query(
      `SELECT 'Admission' as type, p.full_name as patient_name, a.admission_date as timestamp, a.diagnosis as detail
       FROM ipd_admissions a
       JOIN patients p ON a.patient_id = p.patient_id
       ORDER BY a.admission_date DESC LIMIT 4`
    );

    const [recentDispatches] = await db.query(
      `SELECT 'Dispatch' as type, p.full_name as patient_name, d.dispatch_date as timestamp, m.medicine_name as detail
       FROM dispatch d
       JOIN patients p ON d.patient_id = p.patient_id
       JOIN medicines m ON d.medicine_id = m.medicine_id
       ORDER BY d.dispatch_date DESC LIMIT 4`
    );

    // Merge & sort recent activities
    const activities = [...recentAdmissions, ...recentDispatches]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    res.json({
      activeIpd,
      opdToday,
      availableBeds,
      lowStockCount,
      monthlyRevenue,
      activities
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard summary' });
  }
});

module.exports = router;
