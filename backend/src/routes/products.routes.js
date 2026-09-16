const express = require('express');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/products - List all products
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.product_code, p.product_name, p.category, p.unit, p.base_price, p.created_at,
              COALESCE(i.physical_quantity, 0) AS physical_quantity,
              COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
              COALESCE(i.damaged_quantity, 0) AS damaged_quantity,
              (COALESCE(i.physical_quantity, 0) - COALESCE(i.reserved_quantity, 0) - COALESCE(i.damaged_quantity, 0)) AS available_quantity
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       ORDER BY p.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
