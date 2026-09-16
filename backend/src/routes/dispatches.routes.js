const express = require('express');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dispatches - List all dispatches
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.id, d.dispatch_number, d.dispatch_date, d.vehicle_number, d.driver_name, d.notes, d.created_at,
              so.id AS sales_order_id, so.order_number, so.total_amount,
              c.company_name, c.contact_person, c.city,
              u.full_name AS dispatched_by_name,
              COUNT(di.id)::int AS items_count,
              COALESCE(SUM(di.quantity), 0)::float AS total_quantity_dispatched
       FROM dispatches d
       JOIN sales_orders so ON d.sales_order_id = so.id
       JOIN customers c ON so.customer_id = c.id
       LEFT JOIN users u ON d.dispatched_by = u.id
       LEFT JOIN dispatch_items di ON d.id = di.dispatch_id
       GROUP BY d.id, so.id, c.id, u.full_name
       ORDER BY d.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/dispatches/:id - Detailed dispatch with items
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispRes = await query(
      `SELECT d.*, so.order_number, so.order_date, so.total_amount,
              c.company_name, c.contact_person, c.mobile, c.city,
              u.full_name AS dispatched_by_name
       FROM dispatches d
       JOIN sales_orders so ON d.sales_order_id = so.id
       JOIN customers c ON so.customer_id = c.id
       LEFT JOIN users u ON d.dispatched_by = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (dispRes.rows.length === 0) {
      return res.status(404).json({ error: 'Dispatch record not found' });
    }

    const itemsRes = await query(
      `SELECT di.id, di.product_id, p.product_code, p.product_name, p.category, p.unit,
              di.quantity::float AS quantity
       FROM dispatch_items di
       JOIN products p ON di.product_id = p.id
       WHERE di.dispatch_id = $1
       ORDER BY di.id ASC`,
      [id]
    );

    const dispatch = dispRes.rows[0];
    dispatch.items = itemsRes.rows;
    res.json(dispatch);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
