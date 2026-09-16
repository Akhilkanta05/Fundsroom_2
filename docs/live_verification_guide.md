# Live Verification Round - Implementation & Defense Guide

During technical verification rounds, candidates are tested on their ability to explain and rapidly adapt their system to unannounced requirements. This guide provides exact explanations and implementations for the anticipated case study scenarios.

---

## Scenario 1: Damaged Stock Management

### Requirement
Inventory must support a `damaged` stock bucket such that:
$$\text{Available Quantity} = \text{Physical Quantity} - \text{Reserved Quantity} - \text{Damaged Quantity}$$

**Example:**
- $\text{Physical} = 100$
- $\text{Reserved} = 20$
- $\text{Damaged} = 10$
- $\text{Available} = 100 - 20 - 10 = 70$

### Implementation Details in This Codebase
1. **PostgreSQL Schema ([schema.sql](file:///backend/src/db/schema.sql))**:
   ```sql
   CREATE TABLE inventory (
       id SERIAL PRIMARY KEY,
       product_id INTEGER UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
       physical_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
       reserved_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
       damaged_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
       CONSTRAINT chk_inventory_quantities_valid 
           CHECK (reserved_quantity + damaged_quantity <= physical_quantity)
   );
   ```
2. **Backend Stock Check ([salesOrders.routes.js](file:///backend/src/routes/salesOrders.routes.js))**:
   ```javascript
   const available = inv.physical_quantity - inv.reserved_quantity - inv.damaged_quantity;
   if (available < required) {
     return res.status(400).json({ error: 'Insufficient available inventory' });
   }
   ```
3. **API & Frontend Display ([InventoryModal.jsx](file:///frontend/src/components/InventoryModal.jsx))**:
   - `GET /api/inventory` returns `damaged_quantity` and the computed `available_quantity`.
   - `PATCH /api/inventory/:productId` allows Admin to update damaged quantity with immediate validation against physical stock.
   - The UI modal provides input fields and a dedicated "Damaged" column.

---

## Scenario 2: Cancel Confirmed Sales Order & Release Reserved Inventory

### Requirement
Allow an Admin to cancel a `CONFIRMED` order. When cancelled, the reserved quantities must be immediately credited back to available stock.

### Implementation Details in This Codebase
1. **API Endpoint ([salesOrders.routes.js](file:///backend/src/routes/salesOrders.routes.js))**:
   ```javascript
   POST /api/sales-orders/:id/cancel
   ```
2. **Atomic Transaction Logic**:
   ```javascript
   await client.query('BEGIN');
   const order = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
   
   if (order.status === 'DISPATCHED') {
     return res.status(400).json({ error: 'Cannot cancel an order that has already been dispatched' });
   }

   // Release reserved inventory
   if (order.status === 'CONFIRMED') {
     const items = await client.query('SELECT * FROM sales_order_items WHERE sales_order_id = $1', [id]);
     for (const item of items.rows) {
       await client.query(
         `UPDATE inventory 
          SET reserved_quantity = reserved_quantity - $1 
          WHERE product_id = $2`,
         [item.quantity, item.product_id]
       );
     }
   }

   await client.query("UPDATE sales_orders SET status = 'CANCELLED' WHERE id = $1", [id]);
   await client.query('COMMIT');
   ```
3. **Frontend Integration**:
   - In `SalesOrdersPage.jsx`, confirmed orders display a "Cancel" button.
   - Triggering cancellation confirms with the user, releases reserved stock on the server, and refreshes the live inventory snapshot.

---

## Concurrency Race Condition Defense

### Question
*"Two requests arrive simultaneously: User A wants 80 units, User B wants 50 units. Available is 100. How does your backend prevent both from succeeding?"*

### Technical Explanation
1. **Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)**:
   - When `POST /api/sales-orders/:id/confirm` is called, a transaction begins (`BEGIN`).
   - The backend locks the specific product rows in deterministic order (`ORDER BY product_id ASC FOR UPDATE`).
   - If User A and User B send requests concurrently:
     - Request A acquires the lock first. It reads Available = 100. Since $80 \le 100$, it sets Reserved = 80 (Available becomes 20) and commits.
     - Request B waits until Request A releases the lock upon commit.
     - Request B now acquires the lock and reads the freshly committed row (Physical = 100, Reserved = 80, Available = 20).
     - Request B checks if $50 \le 20$. It evaluates to **false**, rolls back the transaction, and returns HTTP 400 with:
       `"Insufficient available inventory for Industrial Product A. Required: 50, Available: 20"`.
2. **Database CHECK Constraint Fallback**:
   - Even if concurrent raw SQL bypassed application logic, the database table constraint:
     `CHECK (reserved_quantity + damaged_quantity <= physical_quantity)`
     physically prevents the database from storing an invalid state.
3. **Automated Concurrency Proof**:
   - Verified in `backend/tests/erp.workflow.test.js` under `"Bonus Test: Simultaneous inventory reservations"` using `Promise.all`.
