const express = require('express');
const { query, getClient } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { calculateQuotationTotals } = require('../utils/math');

const router = express.Router();

async function generateQuotationNumber() {
  const countRes = await query('SELECT COUNT(*) FROM quotations');
  const count = parseInt(countRes.rows[0].count, 10) + 1;
  const year = new Date().getFullYear();
  return `QT-${year}-${String(count).padStart(4, '0')}`;
}

async function generateOrderNumber() {
  const countRes = await query('SELECT COUNT(*) FROM sales_orders');
  const count = parseInt(countRes.rows[0].count, 10) + 1;
  const year = new Date().getFullYear();
  return `SO-${year}-${String(count).padStart(4, '0')}`;
}

// GET /api/quotations - List all quotations with enquiry & customer details
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT q.id, q.quotation_number, q.grand_total::float AS grand_total, q.valid_until, q.status, q.created_at,
              e.id AS enquiry_id, e.enquiry_number,
              c.id AS customer_id, c.company_name, c.contact_person,
              u.full_name AS created_by_name,
              so.id AS sales_order_id, so.order_number, so.status AS sales_order_status
       FROM quotations q
       JOIN enquiries e ON q.enquiry_id = e.id
       JOIN customers c ON q.customer_id = c.id
       LEFT JOIN users u ON q.created_by = u.id
       LEFT JOIN sales_orders so ON q.id = so.quotation_id
       ORDER BY q.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/quotations/:id - Detailed quotation with calculated line items
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const quoteRes = await query(
      `SELECT q.*, q.grand_total::float AS grand_total,
              e.enquiry_number, e.enquiry_date,
              c.company_name, c.contact_person, c.mobile, c.email, c.city,
              u.full_name AS created_by_name,
              so.id AS sales_order_id, so.order_number, so.status AS sales_order_status
       FROM quotations q
       JOIN enquiries e ON q.enquiry_id = e.id
       JOIN customers c ON q.customer_id = c.id
       LEFT JOIN users u ON q.created_by = u.id
       LEFT JOIN sales_orders so ON q.id = so.quotation_id
       WHERE q.id = $1`,
      [id]
    );

    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const itemsRes = await query(
      `SELECT qi.id, qi.product_id, p.product_code, p.product_name, p.category, p.unit,
              qi.quantity::float AS quantity,
              qi.unit_price::float AS unit_price,
              qi.discount_percent::float AS discount_percent,
              qi.gst_percent::float AS gst_percent,
              qi.line_amount::float AS line_amount,
              (COALESCE(i.physical_quantity, 0) - COALESCE(i.reserved_quantity, 0) - COALESCE(i.damaged_quantity, 0))::float AS available_quantity
       FROM quotation_items qi
       JOIN products p ON qi.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE qi.quotation_id = $1
       ORDER BY qi.id ASC`,
      [id]
    );

    const quotation = quoteRes.rows[0];
    quotation.items = itemsRes.rows;
    res.json(quotation);
  } catch (err) {
    next(err);
  }
});

// POST /api/quotations - Create quotation against an enquiry
// Strictly calculates and validates all line items & grand total on backend!
router.post('/', authenticateToken, async (req, res, next) => {
  const client = await getClient();
  try {
    const {
      enquiry_id,
      valid_until,
      items, // [{ product_id, quantity, unit_price, discount_percent, gst_percent }]
    } = req.body;

    if (!enquiry_id) {
      return res.status(400).json({ error: 'Enquiry reference (enquiry_id) is required' });
    }

    // Verify enquiry exists and retrieve its customer_id
    const enqRes = await client.query('SELECT * FROM enquiries WHERE id = $1', [enquiry_id]);
    if (enqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    const enquiry = enqRes.rows[0];

    // Backend validates and calculates line amounts and grand total
    // "Final quotation amount must be calculated or validated by the backend. Do not blindly accept a final amount sent by React."
    const calculation = calculateQuotationTotals(items);

    await client.query('BEGIN');

    const quotationNumber = await generateQuotationNumber();

    const quoteInsertRes = await client.query(
      `INSERT INTO quotations (quotation_number, enquiry_id, customer_id, grand_total, valid_until, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6)
       RETURNING *`,
      [
        quotationNumber,
        enquiry.id,
        enquiry.customer_id,
        calculation.grandTotal,
        valid_until || null,
        req.user.id,
      ]
    );

    const createdQuotation = quoteInsertRes.rows[0];

    const insertedItems = [];
    for (const item of calculation.items) {
      const itemRes = await client.query(
        `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount_percent, gst_percent, line_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          createdQuotation.id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.discount_percent,
          item.gst_percent,
          item.line_amount,
        ]
      );
      insertedItems.push(itemRes.rows[0]);
    }

    // Update enquiry status to QUOTED if it was NEW
    if (enquiry.status === 'NEW') {
      await client.query("UPDATE enquiries SET status = 'QUOTED' WHERE id = $1", [enquiry.id]);
    }

    await client.query('COMMIT');

    createdQuotation.grand_total = calculation.grandTotal;
    createdQuotation.items = insertedItems;

    res.status(201).json(createdQuotation);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PATCH /api/quotations/:id/status - Update quotation status (DRAFT -> SENT -> ACCEPTED / REJECTED)
router.patch('/:id/status', authenticateToken, async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const quoteRes = await client.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const quotation = quoteRes.rows[0];

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE quotations 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    // Business Logic Transition:
    // When quotation is ACCEPTED -> Enquiry status becomes WON
    // When quotation is REJECTED -> Enquiry status becomes LOST (if no other accepted quotations)
    if (status === 'ACCEPTED') {
      await client.query("UPDATE enquiries SET status = 'WON' WHERE id = $1", [quotation.enquiry_id]);
    } else if (status === 'REJECTED') {
      await client.query("UPDATE enquiries SET status = 'LOST' WHERE id = $1", [quotation.enquiry_id]);
    }

    await client.query('COMMIT');

    res.json(updateRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/quotations/:id/convert - Convert ACCEPTED quotation into a Sales Order
router.post('/:id/convert', authenticateToken, async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;

    const quoteRes = await client.query(
      `SELECT q.*, c.company_name 
       FROM quotations q
       JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1`,
      [id]
    );

    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const quotation = quoteRes.rows[0];

    // Rule: DRAFT quotation cannot create an order.
    if (quotation.status === 'DRAFT') {
      return res.status(400).json({
        error: 'Cannot convert quotation: A DRAFT quotation cannot create a Sales Order. Quotation must be ACCEPTED.',
      });
    }

    // Rule: REJECTED quotation cannot create an order.
    if (quotation.status === 'REJECTED') {
      return res.status(400).json({
        error: 'Cannot convert quotation: A REJECTED quotation cannot create a Sales Order. Quotation must be ACCEPTED.',
      });
    }

    // Rule: SENT or any non-accepted status cannot create an order.
    if (quotation.status !== 'ACCEPTED') {
      return res.status(400).json({
        error: `Cannot convert quotation: Quotation status is '${quotation.status}'. Only ACCEPTED quotations can be converted into a Sales Order.`,
      });
    }

    // Rule: One quotation should not accidentally generate multiple Sales Orders.
    const existingOrder = await client.query('SELECT * FROM sales_orders WHERE quotation_id = $1', [id]);
    if (existingOrder.rows.length > 0) {
      return res.status(409).json({
        error: `Cannot convert quotation: A Sales Order (${existingOrder.rows[0].order_number}) has already been generated for this quotation.`,
        sales_order_id: existingOrder.rows[0].id,
        order_number: existingOrder.rows[0].order_number,
      });
    }

    // Fetch quotation items to copy over into sales order items
    const itemsRes = await client.query('SELECT * FROM quotation_items WHERE quotation_id = $1', [id]);
    if (itemsRes.rows.length === 0) {
      return res.status(400).json({ error: 'Quotation does not contain any items' });
    }

    await client.query('BEGIN');

    const orderNumber = await generateOrderNumber();

    const orderInsertRes = await client.query(
      `INSERT INTO sales_orders (order_number, quotation_id, customer_id, order_date, total_amount, status, created_by)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, 'PENDING', $5)
       RETURNING *`,
      [orderNumber, quotation.id, quotation.customer_id, quotation.grand_total, req.user.id]
    );

    const createdOrder = orderInsertRes.rows[0];

    const insertedOrderItems = [];
    for (const item of itemsRes.rows) {
      const itemInsert = await client.query(
        `INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, line_amount)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [createdOrder.id, item.product_id, item.quantity, item.unit_price, item.line_amount]
      );
      insertedOrderItems.push(itemInsert.rows[0]);
    }

    await client.query('COMMIT');

    createdOrder.items = insertedOrderItems;
    res.status(201).json({
      message: 'Quotation successfully converted to Sales Order',
      sales_order: createdOrder,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
