const express = require('express');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

const router = express.Router();

// GET /api/inventory - View inventory availability (Accessible by ADMIN and SALES)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT i.id, i.product_id, p.product_code, p.product_name, p.category, p.unit, p.base_price,
              i.physical_quantity::float AS physical_quantity,
              i.reserved_quantity::float AS reserved_quantity,
              i.damaged_quantity::float AS damaged_quantity,
              (i.physical_quantity - i.reserved_quantity - i.damaged_quantity)::float AS available_quantity,
              i.updated_at
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       ORDER BY p.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/inventory/:productId - Manage inventory quantities (ADMIN ONLY)
router.patch('/:productId', authenticateToken, authorizeRoles('ADMIN'), async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { physical_quantity, damaged_quantity } = req.body;

    const invCheck = await query('SELECT * FROM inventory WHERE product_id = $1', [productId]);
    if (invCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory record not found for this product' });
    }

    const current = invCheck.rows[0];
    const newPhysical = physical_quantity !== undefined ? Number(physical_quantity) : Number(current.physical_quantity);
    const newDamaged = damaged_quantity !== undefined ? Number(damaged_quantity) : Number(current.damaged_quantity);
    const reserved = Number(current.reserved_quantity);

    if (newPhysical < 0 || newDamaged < 0) {
      return res.status(400).json({ error: 'Quantities cannot be negative' });
    }

    if (newPhysical < reserved + newDamaged) {
      return res.status(400).json({
        error: `Physical quantity (${newPhysical}) cannot be less than reserved (${reserved}) + damaged (${newDamaged})`,
      });
    }

    const updateRes = await query(
      `UPDATE inventory
       SET physical_quantity = $1, damaged_quantity = $2, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = $3
       RETURNING *,
        (physical_quantity - reserved_quantity - damaged_quantity)::float AS available_quantity`,
      [newPhysical, newDamaged, productId]
    );

    res.json(updateRes.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
