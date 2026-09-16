const request = require('supertest');
const app = require('../src/app');
const { initDb, exec, query, closeDb } = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

describe('Full-Stack ERP Technical Case Study Test Suite', () => {
  let adminToken = '';
  let salesToken = '';
  let testCustomerId = null;
  let testProductId = null;
  let testProductBId = null;

  beforeAll(async () => {
    // Ensure clean database for tests
    process.env.NODE_ENV = 'test';
    await initDb();

    // Migrate schema
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/db/schema.sql'), 'utf-8');
    await exec(schemaSql);

    // Seed test users
    const adminPass = await bcrypt.hash('Admin@123', 10);
    const salesPass = await bcrypt.hash('Sales@123', 10);

    await query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES 
        ('admin@erp.com', $1, 'ADMIN', 'System Admin'),
        ('sales@erp.com', $2, 'SALES', 'Sales Representative')`,
      [adminPass, salesPass]
    );

    // Seed test customer
    const custRes = await query(
      `INSERT INTO customers (company_name, contact_person, mobile, email, city)
       VALUES ('Industrial Dynamics Corp', 'Sunil Rao', '+91 9988776655', 'purchases@ind-dyn.com', 'Mumbai')
       RETURNING id`
    );
    testCustomerId = custRes.rows[0].id;

    // Seed test products & inventory
    // Product A: 100 physical, 30 reserved -> 70 available
    const prodARes = await query(
      `INSERT INTO products (product_code, product_name, category, unit, base_price)
       VALUES ('TST-PRD-A', 'Industrial Control Valve', 'Valves', 'PCS', 5000.00)
       RETURNING id`
    );
    testProductId = prodARes.rows[0].id;
    await query(
      `INSERT INTO inventory (product_id, physical_quantity, reserved_quantity, damaged_quantity)
       VALUES ($1, 100, 30, 0)`,
      [testProductId]
    );

    // Product B: 50 physical, 10 reserved -> 40 available
    const prodBRes = await query(
      `INSERT INTO products (product_code, product_name, category, unit, base_price)
       VALUES ('TST-PRD-B', 'Heavy Slurry Impeller', 'Pumps', 'SET', 12000.00)
       RETURNING id`
    );
    testProductBId = prodBRes.rows[0].id;
    await query(
      `INSERT INTO inventory (product_id, physical_quantity, reserved_quantity, damaged_quantity)
       VALUES ($1, 50, 10, 0)`,
      [testProductBId]
    );

    // Login Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@erp.com', password: 'Admin@123' });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.token;

    // Login Sales
    const salesLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@erp.com', password: 'Sales@123' });
    expect(salesLoginRes.status).toBe(200);
    salesToken = salesLoginRes.body.token;
  });

  afterAll(async () => {
    await closeDb();
  });

  // =========================================================================
  // Test 1: Quotation total is calculated correctly
  // =========================================================================
  test('Test 1: Quotation total is calculated correctly on backend (Base, Discount, GST, Grand Total)', async () => {
    // 1. Create an enquiry first
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [
          { product_id: testProductId, quantity: 10 },
          { product_id: testProductBId, quantity: 2 },
        ],
      });
    expect(enqRes.status).toBe(201);
    const enquiryId = enqRes.body.id;

    /**
     * Item 1: Qty 10 @ Rs 5,000 = Base Rs 50,000
     * Discount 10% = Rs 5,000 -> Taxable = Rs 45,000
     * GST 18% = Rs 45,000 * 0.18 = Rs 8,100
     * Line 1 Total = 45,000 + 8,100 = Rs 53,100
     * 
     * Item 2: Qty 2 @ Rs 12,000 = Base Rs 24,000
     * Discount 5% = Rs 1,200 -> Taxable = Rs 22,800
     * GST 18% = Rs 22,800 * 0.18 = Rs 4,104
     * Line 2 Total = 22,800 + 4,104 = Rs 26,904
     * 
     * Grand Total = 53,100 + 26,904 = Rs 80,004.00
     */
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enquiryId,
        valid_until: '2026-12-31',
        items: [
          {
            product_id: testProductId,
            quantity: 10,
            unit_price: 5000,
            discount_percent: 10,
            gst_percent: 18,
          },
          {
            product_id: testProductBId,
            quantity: 2,
            unit_price: 12000,
            discount_percent: 5,
            gst_percent: 18,
          },
        ],
      });

    expect(quoteRes.status).toBe(201);
    expect(quoteRes.body.grand_total).toBe(80004.00);
    expect(quoteRes.body.status).toBe('DRAFT');

    const item1 = quoteRes.body.items.find(i => i.product_id === testProductId);
    const item2 = quoteRes.body.items.find(i => i.product_id === testProductBId);

    expect(Number(item1.line_amount)).toBe(53100.00);
    expect(Number(item2.line_amount)).toBe(26904.00);
  });

  // =========================================================================
  // Test 2: Rejected/Draft quotation cannot create a Sales Order
  // =========================================================================
  test('Test 2: Rejected/Draft quotation cannot create a Sales Order', async () => {
    // 1. Create an enquiry and draft quotation
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [{ product_id: testProductId, quantity: 5 }],
      });
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enqRes.body.id,
        items: [
          { product_id: testProductId, quantity: 5, unit_price: 5000, discount_percent: 0, gst_percent: 18 },
        ],
      });
    const quoteId = quoteRes.body.id;
    expect(quoteRes.body.status).toBe('DRAFT');

    // Attempt 1: Convert when DRAFT -> MUST FAIL
    const draftConvertRes = await request(app)
      .post(`/api/quotations/${quoteId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(draftConvertRes.status).toBe(400);
    expect(draftConvertRes.body.error).toMatch(/DRAFT quotation cannot create a Sales Order/i);

    // Transition quotation to REJECTED
    const rejectRes = await request(app)
      .patch(`/api/quotations/${quoteId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'REJECTED' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');

    // Attempt 2: Convert when REJECTED -> MUST FAIL
    const rejectedConvertRes = await request(app)
      .post(`/api/quotations/${quoteId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(rejectedConvertRes.status).toBe(400);
    expect(rejectedConvertRes.body.error).toMatch(/REJECTED quotation cannot create a Sales Order/i);
  });

  // =========================================================================
  // Test 3: Same quotation cannot generate duplicate Sales Orders
  // =========================================================================
  test('Test 3: Same quotation cannot generate duplicate Sales Orders', async () => {
    // 1. Create enquiry & quotation
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [{ product_id: testProductId, quantity: 5 }],
      });
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enqRes.body.id,
        items: [
          { product_id: testProductId, quantity: 5, unit_price: 5000, discount_percent: 0, gst_percent: 18 },
        ],
      });
    const quoteId = quoteRes.body.id;

    // Accept the quotation
    await request(app)
      .patch(`/api/quotations/${quoteId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    // First conversion -> MUST SUCCEED (201 Created)
    const firstConvertRes = await request(app)
      .post(`/api/quotations/${quoteId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(firstConvertRes.status).toBe(201);
    expect(firstConvertRes.body.sales_order.order_number).toBeDefined();

    // Second conversion attempt with the same quotation -> MUST FAIL (409 Conflict)
    const secondConvertRes = await request(app)
      .post(`/api/quotations/${quoteId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(secondConvertRes.status).toBe(409);
    expect(secondConvertRes.body.error).toMatch(/already been generated for this quotation/i);
  });

  // =========================================================================
  // Test 4: Cannot reserve more than available inventory
  // =========================================================================
  test('Test 4: Cannot reserve more than available inventory', async () => {
    // testProductId currently has Physical = 100, Reserved = 30 -> Available = 70.
    // Create an order demanding 80 units (exceeds available 70!)
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [{ product_id: testProductId, quantity: 80 }],
      });
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enqRes.body.id,
        items: [
          { product_id: testProductId, quantity: 80, unit_price: 5000, discount_percent: 0, gst_percent: 18 },
        ],
      });
    const quoteId = quoteRes.body.id;

    await request(app)
      .patch(`/api/quotations/${quoteId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    const convertRes = await request(app)
      .post(`/api/quotations/${quoteId}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderId = convertRes.body.sales_order.id;

    // Admin attempts to confirm order requiring 80 units when only 70 available
    const confirmRes = await request(app)
      .post(`/api/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(confirmRes.status).toBe(400);
    expect(confirmRes.body.error).toMatch(/Insufficient available inventory/i);

    // Verify inventory quantities were NOT modified
    const invRes = await query('SELECT * FROM inventory WHERE product_id = $1', [testProductId]);
    expect(Number(invRes.rows[0].physical_quantity)).toBe(100);
    expect(Number(invRes.rows[0].reserved_quantity)).toBe(30); // Unchanged!
  });

  // =========================================================================
  // Test 5: Unauthorized user cannot perform a restricted operation
  // =========================================================================
  test('Test 5: Unauthorized user cannot perform a restricted operation (RBAC)', async () => {
    // Create a pending sales order
    const enqRes = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [{ product_id: testProductId, quantity: 2 }],
      });
    const quoteRes = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enqRes.body.id,
        items: [
          { product_id: testProductId, quantity: 2, unit_price: 5000, discount_percent: 0, gst_percent: 18 },
        ],
      });
    await request(app)
      .patch(`/api/quotations/${quoteRes.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const convertRes = await request(app)
      .post(`/api/quotations/${quoteRes.body.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderId = convertRes.body.sales_order.id;

    // 1. Sales User tries to confirm Sales Order -> 403 Forbidden
    const salesConfirmRes = await request(app)
      .post(`/api/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(salesConfirmRes.status).toBe(403);
    expect(salesConfirmRes.body.error).toMatch(/Role 'SALES' is not authorized/i);

    // 2. Sales User tries to dispatch Sales Order -> 403 Forbidden
    const salesDispatchRes = await request(app)
      .post(`/api/sales-orders/${orderId}/dispatch`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ vehicle_number: 'MH-12-1234', driver_name: 'John' });
    expect(salesDispatchRes.status).toBe(403);

    // 3. Sales User tries to alter inventory -> 403 Forbidden
    const salesInvRes = await request(app)
      .patch(`/api/inventory/${testProductId}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ physical_quantity: 999 });
    expect(salesInvRes.status).toBe(403);

    // 4. Unauthenticated user (no token) -> 401 Unauthorized
    const unauthRes = await request(app).post(`/api/sales-orders/${orderId}/confirm`);
    expect(unauthRes.status).toBe(401);
  });

  // =========================================================================
  // Bonus Test: Simultaneous Inventory Reservations (Concurrency Race Condition)
  // =========================================================================
  test('Bonus Test: Simultaneous inventory reservations ensure database-level race condition prevention', async () => {
    // Setup dedicated product with exactly 100 physical, 0 reserved -> 100 available
    const concProdRes = await query(
      `INSERT INTO products (product_code, product_name, category, unit, base_price)
       VALUES ('CONC-PRD-01', 'High-Load Turbopump', 'Pumps', 'SET', 25000.00)
       RETURNING id`
    );
    const concProdId = concProdRes.rows[0].id;
    await query(
      `INSERT INTO inventory (product_id, physical_quantity, reserved_quantity, damaged_quantity)
       VALUES ($1, 100, 0, 0)`,
      [concProdId]
    );

    // Order A requires 80 units
    const enqA = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [{ product_id: concProdId, quantity: 80 }],
      });
    const quoteA = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enqA.body.id,
        items: [{ product_id: concProdId, quantity: 80, unit_price: 25000 }],
      });
    await request(app)
      .patch(`/api/quotations/${quoteA.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const orderARes = await request(app)
      .post(`/api/quotations/${quoteA.body.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderAId = orderARes.body.sales_order.id;

    // Order B requires 50 units
    const enqB = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [{ product_id: concProdId, quantity: 50 }],
      });
    const quoteB = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enqB.body.id,
        items: [{ product_id: concProdId, quantity: 50, unit_price: 25000 }],
      });
    await request(app)
      .patch(`/api/quotations/${quoteB.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const orderBRes = await request(app)
      .post(`/api/quotations/${quoteB.body.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderBId = orderBRes.body.sales_order.id;

    // Both requests sent simultaneously via Promise.all
    // Total demanded = 80 + 50 = 130 > Available (100).
    // Application must guarantee BOTH cannot succeed! Exactly one succeeds, one fails.
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/sales-orders/${orderAId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .post(`/api/sales-orders/${orderBId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 400]);

    // Check database inventory state: never over-reserved!
    const finalInvRes = await query('SELECT * FROM inventory WHERE product_id = $1', [concProdId]);
    const finalInv = finalInvRes.rows[0];
    const reserved = Number(finalInv.reserved_quantity);

    // Reserved must be either 80 or 50, but never 130!
    expect([50, 80]).toContain(reserved);
    expect(Number(finalInv.physical_quantity)).toBe(100);
    expect(100 - reserved).toBeGreaterThanOrEqual(0);
  });

  // =========================================================================
  // Dispatch Workflow Verification
  // =========================================================================
  test('Complete Dispatch Flow: Physical and Reserved stock decrease atomically', async () => {
    // Create and confirm an order for 20 units of testProductId
    // Current available is 70, physical 100, reserved 30
    const enq = await request(app)
      .post('/api/enquiries')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: testCustomerId,
        items: [{ product_id: testProductId, quantity: 20 }],
      });
    const quote = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiry_id: enq.body.id,
        items: [{ product_id: testProductId, quantity: 20, unit_price: 5000 }],
      });
    await request(app)
      .patch(`/api/quotations/${quote.body.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });
    const orderRes = await request(app)
      .post(`/api/quotations/${quote.body.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    const orderId = orderRes.body.sales_order.id;

    // Confirm order (Admin)
    const confirmRes = await request(app)
      .post(`/api/sales-orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(confirmRes.status).toBe(200);

    // Before dispatch: Physical = 100, Reserved = 50 (30 + 20)
    const beforeInv = (await query('SELECT * FROM inventory WHERE product_id = $1', [testProductId])).rows[0];
    expect(Number(beforeInv.physical_quantity)).toBe(100);
    expect(Number(beforeInv.reserved_quantity)).toBe(50);

    // Dispatch order with vehicle & driver
    const dispatchRes = await request(app)
      .post(`/api/sales-orders/${orderId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicle_number: 'MH-12-TR-4567',
        driver_name: 'Vikram Singh',
        notes: 'Dispatched on flatbed truck',
      });

    expect(dispatchRes.status).toBe(201);
    expect(dispatchRes.body.dispatch.dispatch_number).toMatch(/^DSP-/);

    // After dispatch:
    // Physical decreases from 100 to 80 (100 - 20)
    // Reserved decreases from 50 to 30 (50 - 20)
    // Available = 80 - 30 = 50 (Remains unchanged by dispatch action itself!)
    const afterInv = (await query('SELECT * FROM inventory WHERE product_id = $1', [testProductId])).rows[0];
    expect(Number(afterInv.physical_quantity)).toBe(80);
    expect(Number(afterInv.reserved_quantity)).toBe(30);

    // Duplicate dispatch attempt -> MUST FAIL
    const dupDispatchRes = await request(app)
      .post(`/api/sales-orders/${orderId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicle_number: 'MH-12-TR-4567',
        driver_name: 'Vikram Singh',
      });
    expect(dupDispatchRes.status).toBe(400);
    expect(dupDispatchRes.body.error).toMatch(/already dispatched/i);
  });
});
