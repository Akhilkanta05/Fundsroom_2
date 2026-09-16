const express = require('express');
const { query, getClient } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to generate next enquiry number
async function generateEnquiryNumber() {
  const countRes = await query('SELECT COUNT(*) FROM enquiries');
  const count = parseInt(countRes.rows[0].count, 10) + 1;
  const year = new Date().getFullYear();
  return `ENQ-${year}-${String(count).padStart(4, '0')}`;
}

// GET /api/enquiries - List all enquiries with customer and items summary
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.enquiry_number, e.enquiry_date, e.required_date, e.status, e.notes, e.created_at,
              c.id AS customer_id, c.company_name, c.contact_person, c.mobile, c.email, c.city,
              u.full_name AS created_by_name,
              COUNT(ei.id)::int AS items_count,
              COALESCE(SUM(ei.quantity), 0)::float AS total_units_requested
       FROM enquiries e
       JOIN customers c ON e.customer_id = c.id
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN enquiry_items ei ON e.id = ei.enquiry_id
       GROUP BY e.id, c.id, u.full_name
       ORDER BY e.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/enquiries/:id - Detailed enquiry with items
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const enqRes = await query(
      `SELECT e.*, c.company_name, c.contact_person, c.mobile, c.email, c.city,
              u.full_name AS created_by_name
       FROM enquiries e
       JOIN customers c ON e.customer_id = c.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    if (enqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const itemsRes = await query(
      `SELECT ei.id, ei.product_id, p.product_code, p.product_name, p.category, p.unit, p.base_price,
              ei.quantity::float AS quantity,
              (COALESCE(i.physical_quantity, 0) - COALESCE(i.reserved_quantity, 0) - COALESCE(i.damaged_quantity, 0))::float AS available_quantity
       FROM enquiry_items ei
       JOIN products p ON ei.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE ei.enquiry_id = $1
       ORDER BY ei.id ASC`,
      [id]
    );

    const enquiry = enqRes.rows[0];
    enquiry.items = itemsRes.rows;
    res.json(enquiry);
  } catch (err) {
    next(err);
  }
});

// POST /api/enquiries - Create a new customer enquiry with multiple products
router.post('/', authenticateToken, async (req, res, next) => {
  const client = await getClient();
  try {
    const {
      customer_id,
      customer_data, // { company_name, contact_person, mobile, email, city } if creating new customer inline
      required_date,
      notes,
      items, // [{ product_id, quantity }]
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one product item is required for the enquiry' });
    }

    for (const it of items) {
      if (!it.product_id || !it.quantity || Number(it.quantity) <= 0) {
        return res.status(400).json({ error: 'Each item must have a valid product_id and quantity > 0' });
      }
    }

    await client.query('BEGIN');

    let finalCustomerId = customer_id;

    // Support creating customer inline or using existing customer
    if (!finalCustomerId) {
      if (!customer_data || !customer_data.company_name) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Either customer_id or complete customer_data is required' });
      }
      const newCust = await client.query(
        `INSERT INTO customers (company_name, contact_person, mobile, email, city)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          customer_data.company_name.trim(),
          (customer_data.contact_person || 'N/A').trim(),
          (customer_data.mobile || 'N/A').trim(),
          (customer_data.email || 'N/A').trim(),
          (customer_data.city || 'N/A').trim(),
        ]
      );
      finalCustomerId = newCust.rows[0].id;
    }

    const enquiryNumber = await generateEnquiryNumber();

    const insertEnqRes = await client.query(
      `INSERT INTO enquiries (enquiry_number, customer_id, required_date, notes, status, created_by)
       VALUES ($1, $2, $3, $4, 'NEW', $5)
       RETURNING *`,
      [enquiryNumber, finalCustomerId, required_date || null, notes || null, req.user.id]
    );

    const createdEnquiry = insertEnqRes.rows[0];

    // Insert enquiry line items
    const insertedItems = [];
    for (const it of items) {
      const itemRes = await client.query(
        `INSERT INTO enquiry_items (enquiry_id, product_id, quantity)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [createdEnquiry.id, it.product_id, Number(it.quantity)]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    await client.query('COMMIT');

    createdEnquiry.items = insertedItems;
    res.status(201).json(createdEnquiry);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
