const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST api/bills/generate
// @desc    Generate a bill for a patient (Calls SP which aggregates dispatches and creates bill items)
router.post('/generate', auth, async (req, res) => {
  const { patient_id, payment_mode } = req.body;

  if (!patient_id) {
    return res.status(400).json({ message: 'Patient ID is required' });
  }

  const mode = payment_mode || 'Cash';

  try {
    // We execute the stored procedure. Since it has an OUT parameter,
    // we need to set up variables in MySQL and select them.
    // In SQL:
    // CALL sp_generate_bill(?, ?, @bill_id); SELECT @bill_id AS bill_id;
    
    // We can do this in a single connection transaction or simple sequence
    // mysql2 supports multiple statements if configured, but by default we can run them in order or in a transaction.
    // The cleanest way in mysql2 is:
    await db.query('CALL sp_generate_bill(?, ?, @bill_id)', [patient_id, mode]);
    const [result] = await db.query('SELECT @bill_id AS bill_id');
    
    const billId = result[0].bill_id;

    if (!billId) {
      return res.status(400).json({ message: 'Failed to generate bill. Ensure patient has dispatches today.' });
    }

    res.status(201).json({
      message: 'Bill generated successfully',
      bill_id: billId
    });

  } catch (error) {
    console.error('Billing SP execution error:', error);
    res.status(500).json({ message: 'Server error during bill generation' });
  }
});

// @route   GET api/bills/patient/:patient_id
// @desc    Get all bills for a patient
router.get('/patient/:patient_id', auth, async (req, res) => {
  const patientId = req.params.patient_id;
  try {
    const [rows] = await db.query(
      'SELECT * FROM bills WHERE patient_id = ? ORDER BY bill_date DESC',
      [patientId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving bills' });
  }
});

// @route   GET api/bills/:bill_id
// @desc    Get complete details of a specific bill (for screen display and jsPDF)
router.get('/:bill_id', auth, async (req, res) => {
  const billId = req.params.bill_id;

  try {
    // Get bill header and patient information
    const [billRows] = await db.query(
      `SELECT b.*, p.full_name as patient_name, p.patient_type, p.phone, p.email, p.address
       FROM bills b
       JOIN patients p ON b.patient_id = p.patient_id
       WHERE b.bill_id = ?`,
      [billId]
    );

    if (billRows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const bill = billRows[0];

    // Get bed assignment details if patient is IPD and was admitted
    if (bill.patient_type === 'IPD') {
      const [bedRows] = await db.query(
        `SELECT b.bed_number, w.ward_name
         FROM ipd_admissions a
         JOIN beds b ON a.bed_id = b.bed_id
         JOIN wards w ON b.ward_id = w.ward_id
         WHERE a.patient_id = ? 
         ORDER BY a.admission_date DESC LIMIT 1`,
        [bill.patient_id]
      );
      if (bedRows.length > 0) {
        bill.bed_number = bedRows[0].bed_number;
        bill.ward_name = bedRows[0].ward_name;
      }
    }

    // Get attending doctor details
    let doctor = { full_name: 'Duty Doctor', specialization: 'General Medicine' };
    if (bill.patient_type === 'IPD') {
      const [docRows] = await db.query(
        `SELECT d.full_name, d.specialization
         FROM ipd_admissions a
         JOIN doctors d ON a.attending_doctor = d.doctor_id
         WHERE a.patient_id = ?
         ORDER BY a.admission_date DESC LIMIT 1`,
        [bill.patient_id]
      );
      if (docRows.length > 0) {
        doctor = docRows[0];
      }
    } else {
      const [docRows] = await db.query(
        `SELECT d.full_name, d.specialization
         FROM opd_visits v
         JOIN doctors d ON v.doctor_id = d.doctor_id
         WHERE v.patient_id = ?
         ORDER BY v.visit_date DESC LIMIT 1`,
        [bill.patient_id]
      );
      if (docRows.length > 0) {
        doctor = docRows[0];
      }
    }
    bill.doctor = doctor;

    // Get bill line items
    const [items] = await db.query(

      'SELECT * FROM bill_items WHERE bill_id = ?',
      [billId]
    );

    bill.items = items;

    res.json(bill);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error retrieving bill details' });
  }
});

// @route   PUT api/bills/:bill_id/discount
// @desc    Apply a discount to the bill
router.put('/:bill_id/discount', auth, async (req, res) => {
  const billId = req.params.bill_id;
  const { discount } = req.body; // absolute numeric value

  if (discount === undefined || isNaN(discount)) {
    return res.status(400).json({ message: 'Valid discount value is required' });
  }

  try {
    const [billRows] = await db.query('SELECT total_amount FROM bills WHERE bill_id = ?', [billId]);
    if (billRows.length === 0) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const total = parseFloat(billRows[0].total_amount);
    const finalAmount = Math.max(0, total - parseFloat(discount));

    await db.query(
      'UPDATE bills SET discount = ?, final_amount = ? WHERE bill_id = ?',
      [discount, finalAmount, billId]
    );

    res.json({
      message: 'Discount applied successfully',
      discount,
      final_amount: finalAmount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error applying discount' });
  }
});

module.exports = router;
