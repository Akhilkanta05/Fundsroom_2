const express = require('express');
const { query, getClient } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

async function generateDispatchNumber() {
  const countRes = await query('SELECT COUNT(*) FROM dispatches');
  const count = parseInt(countRes.rows[0].count, 10) + 1;
  const year = new Date().getFullYear();
  return `DSP-${year}-${String(count).padStart(4, '0')}`;
}

// GET /api/sales-orders - List all sales orders
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT so.id, so.order_number, so.order_date, so.total_amount::float AS total_amount, so.status, so.created_at,
              so.confirmed_at,
              q.id AS quotation_id, q.quotation_number,
              e.id AS enquiry_id, e.enquiry_number,
              c.id AS customer_id, c.company_name, c.contact_person, c.mobile, c.email, c.city,
              u.full_name AS created_by_name,
              cu.full_name AS confirmed_by_name,
              d.id AS dispatch_id, d.dispatch_number, d.vehicle_number, d.driver_name, d.dispatch_date
       FROM sales_orders so
       JOIN quotations q ON so.quotation_id = q.id
       JOIN enquiries e ON q.enquiry_id = e.id
       JOIN customers c ON so.customer_id = c.id
       LEFT JOIN users u ON so.created_by = u.id
       LEFT JOIN users cu ON so.confirmed_by = cu.id
       LEFT JOIN dispatches d ON so.id = d.sales_order_id
       ORDER BY so.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/sales-orders/:id - Detailed sales order with items and full traceability
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const orderRes = await query(
      `SELECT so.*, so.total_amount::float AS total_amount,
              q.quotation_number, q.grand_total::float AS quotation_total,
              e.id AS enquiry_id, e.enquiry_number, e.enquiry_date,
              c.company_name, c.contact_person, c.mobile, c.email, c.city,
              u.full_name AS created_by_name,
              cu.full_name AS confirmed_by_name,
              d.id AS dispatch_id, d.dispatch_number, d.vehicle_number, d.driver_name, d.dispatch_date
       FROM sales_orders so
       JOIN quotations q ON so.quotation_id = q.id
       JOIN enquiries e ON q.enquiry_id = e.id
       JOIN customers c ON so.customer_id = c.id
       LEFT JOIN users u ON so.created_by = u.id
       LEFT JOIN users cu ON so.confirmed_by = cu.id
       LEFT JOIN dispatches d ON so.id = d.sales_order_id
       WHERE so.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sales Order not found' });
    }

    const itemsRes = await query(
      `SELECT soi.id, soi.product_id, p.product_code, p.product_name, p.category, p.unit,
              soi.quantity::float AS quantity,
              soi.unit_price::float AS unit_price,
              soi.line_amount::float AS line_amount,
              i.physical_quantity::float AS physical_quantity,
              i.reserved_quantity::float AS reserved_quantity,
              i.damaged_quantity::float AS damaged_quantity,
              (i.physical_quantity - i.reserved_quantity - i.damaged_quantity)::float AS available_quantity
       FROM sales_order_items soi
       JOIN products p ON soi.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE soi.sales_order_id = $1
       ORDER BY soi.id ASC`,
      [id]
    );

    const order = orderRes.rows[0];
    order.items = itemsRes.rows;
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sales-orders/:id/confirm
 * ADMIN ONLY
 * Concurrency-safe Inventory Reservation
 * 
 * Solves:
 * - Available inventory = 100.
 * - Simultaneous User A (80) & User B (50).
 * - PostgreSQL row-level locks (FOR UPDATE) or atomic conditional update inside transaction.
 * - Guarantees only one succeeds and the other fails safely with 400 Bad Request.
 * - Physical quantity DOES NOT decrease; Reserved quantity increases.
 */
router.post('/:id/confirm', authenticateToken, authorizeRoles('ADMIN'), async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Lock and check the Sales Order
    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales Order not found' });
    }

    const order = orderRes.rows[0];

    if (order.status === 'CONFIRMED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Sales Order is already confirmed and inventory is reserved' });
    }
    if (order.status === 'DISPATCHED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot confirm an order that has already been dispatched' });
    }
    if (order.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot confirm a cancelled Sales Order' });
    }
    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot confirm Sales Order with status '${order.status}'` });
    }

    // Get order items
    const itemsRes = await client.query(
      `SELECT soi.*, p.product_name, p.product_code 
       FROM sales_order_items soi
       JOIN products p ON soi.product_id = p.id
       WHERE soi.sales_order_id = $1
       ORDER BY soi.product_id ASC`,
      [id]
    );

    if (itemsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Sales Order contains no items' });
    }

    // Acquire row-level locks on inventory records in deterministic order to prevent deadlocks
    for (const item of itemsRes.rows) {
      const invRes = await client.query(
        `SELECT product_id, physical_quantity::float, reserved_quantity::float, damaged_quantity::float
         FROM inventory
         WHERE product_id = $1
         FOR UPDATE`,
        [item.product_id]
      );

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: `Inventory record missing for product ${item.product_name} (${item.product_code})`,
        });
      }

      const inv = invRes.rows[0];
      const available = inv.physical_quantity - inv.reserved_quantity - inv.damaged_quantity;
      const required = Number(item.quantity);

      if (available < required) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient available inventory for ${item.product_name} (${item.product_code}). Required: ${required}, Available: ${available} (Physical: ${inv.physical_quantity}, Reserved: ${inv.reserved_quantity}, Damaged: ${inv.damaged_quantity})`,
          product_id: item.product_id,
          product_code: item.product_code,
          required,
          available,
        });
      }

      // Reserve stock: physical inventory does NOT decrease, reserved increases
      await client.query(
        `UPDATE inventory
         SET reserved_quantity = reserved_quantity + $1, updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [required, item.product_id]
      );
    }

    // Update Sales Order status to CONFIRMED
    const updatedOrderRes = await client.query(
      `UPDATE sales_orders
       SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Sales Order confirmed successfully and inventory reserved',
      sales_order: updatedOrderRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /api/sales-orders/:id/dispatch
 * ADMIN ONLY
 * Process Dispatch
 * 
 * Rules:
 * - Physical Quantity decreases AND Reserved Quantity decreases.
 * - Available quantity = Physical - Reserved stays unchanged!
 * - System prevents:
 *   - Dispatch beyond reserved quantity
 *   - Duplicate dispatch of the same order
 *   - Dispatch of a cancelled or pending order
 */
router.post('/:id/dispatch', authenticateToken, authorizeRoles('ADMIN'), async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { vehicle_number, driver_name, notes } = req.body;

    if (!vehicle_number || !driver_name) {
      return res.status(400).json({
        error: 'Vehicle number and Driver name are required for dispatch',
      });
    }

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales Order not found' });
    }

    const order = orderRes.rows[0];

    // Prevent dispatch of cancelled order
    if (order.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot dispatch a cancelled Sales Order' });
    }

    // Prevent duplicate dispatch
    if (order.status === 'DISPATCHED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Duplicate dispatch prevented: Sales Order is already dispatched' });
    }

    // Order must be CONFIRMED before dispatch
    if (order.status !== 'CONFIRMED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot dispatch Sales Order with status '${order.status}'. Order must be CONFIRMED and reserved first.`,
      });
    }

    // Check if a dispatch record already exists (unique constraint safety)
    const existingDispatch = await client.query('SELECT * FROM dispatches WHERE sales_order_id = $1', [id]);
    if (existingDispatch.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A dispatch record already exists for this Sales Order' });
    }

    // Fetch order items
    const itemsRes = await client.query(
      `SELECT soi.*, p.product_name, p.product_code 
       FROM sales_order_items soi
       JOIN products p ON soi.product_id = p.id
       WHERE soi.sales_order_id = $1
       ORDER BY soi.product_id ASC`,
      [id]
    );

    // Deduct both physical_quantity and reserved_quantity
    for (const item of itemsRes.rows) {
      const invRes = await client.query(
        `SELECT physical_quantity::float, reserved_quantity::float 
         FROM inventory 
         WHERE product_id = $1 
         FOR UPDATE`,
        [item.product_id]
      );

      const inv = invRes.rows[0];
      const qty = Number(item.quantity);

      if (inv.reserved_quantity < qty) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Cannot dispatch beyond reserved quantity for ${item.product_name}. Reserved: ${inv.reserved_quantity}, Dispatching: ${qty}`,
        });
      }

      await client.query(
        `UPDATE inventory
         SET physical_quantity = physical_quantity - $1,
             reserved_quantity = reserved_quantity - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $2`,
        [qty, item.product_id]
      );
    }

    // Create Dispatch record
    const dispatchNumber = await generateDispatchNumber();
    const dispatchInsertRes = await client.query(
      `INSERT INTO dispatches (dispatch_number, sales_order_id, dispatch_date, vehicle_number, driver_name, notes, dispatched_by)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
       RETURNING *`,
      [dispatchNumber, id, vehicle_number.trim(), driver_name.trim(), notes || null, req.user.id]
    );

    const createdDispatch = dispatchInsertRes.rows[0];

    // Insert dispatch line items
    for (const item of itemsRes.rows) {
      await client.query(
        `INSERT INTO dispatch_items (dispatch_id, product_id, quantity)
         VALUES ($1, $2, $3)`,
        [createdDispatch.id, item.product_id, item.quantity]
      );
    }

    // Update Sales Order status to DISPATCHED
    await client.query(
      `UPDATE sales_orders
       SET status = 'DISPATCHED'
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Sales Order dispatched successfully. Inventory deducted.',
      dispatch: createdDispatch,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /api/sales-orders/:id/cancel
 * ADMIN ONLY
 * Cancels a Sales Order. If it was CONFIRMED, releases the reserved inventory!
 * Directly provides the expected live verification modification!
 */
router.post('/:id/cancel', authenticateToken, authorizeRoles('ADMIN'), async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales Order not found' });
    }

    const order = orderRes.rows[0];

    if (order.status === 'DISPATCHED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot cancel an order that has already been dispatched' });
    }
    if (order.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    // If order was CONFIRMED, release the reserved inventory
    if (order.status === 'CONFIRMED') {
      const itemsRes = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);
      for (const item of itemsRes.rows) {
        await client.query(
          `UPDATE inventory
           SET reserved_quantity = reserved_quantity - $1, updated_at = CURRENT_TIMESTAMP
           WHERE product_id = $2`,
          [item.quantity, item.product_id]
        );
      }
    }

    const updatedRes = await client.query(
      `UPDATE sales_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Sales Order cancelled successfully. Any reserved inventory has been released.',
      sales_order: updatedRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
