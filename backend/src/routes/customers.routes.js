const express = require('express');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers - List all customers
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, company_name, contact_person, mobile, email, city, created_at 
       FROM customers 
       ORDER BY company_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/customers - Create new customer
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { company_name, contact_person, mobile, email, city } = req.body;
    if (!company_name || !contact_person || !mobile || !email || !city) {
      return res.status(400).json({ error: 'All customer fields (company_name, contact_person, mobile, email, city) are required' });
    }

    const insertRes = await query(
      `INSERT INTO customers (company_name, contact_person, mobile, email, city)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [company_name.trim(), contact_person.trim(), mobile.trim(), email.trim(), city.trim()]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
