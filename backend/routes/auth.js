const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// @route   POST api/auth/login
// @desc    Authenticate staff & get token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM staff WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const staff = rows[0];

    // Validate password
    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Sign JWT
    const token = jwt.sign(
      { staff_id: staff.staff_id, username: staff.username, role: staff.role, full_name: staff.full_name },
      process.env.JWT_SECRET || 'supersecretjwttokenmedicarepro2026',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      staff: {
        staff_id: staff.staff_id,
        username: staff.username,
        full_name: staff.full_name,
        role: staff.role,
        email: staff.email
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST api/auth/register
// @desc    Register a new staff member (Admin only or setup)
router.post('/register', async (req, res) => {
  const { full_name, role, phone, email, username, password } = req.body;

  if (!full_name || !role || !username || !password) {
    return res.status(400).json({ message: 'Please fill in all required fields' });
  }

  try {
    // Check if username exists
    const [existing] = await db.query('SELECT * FROM staff WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert staff
    const [result] = await db.query(
      'INSERT INTO staff (full_name, role, phone, email, username, password) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, role, phone || null, email || null, username, hashedPassword]
    );

    res.status(201).json({
      message: 'Staff registered successfully',
      staffId: result.insertId
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during staff registration' });
  }
});

module.exports = router;
