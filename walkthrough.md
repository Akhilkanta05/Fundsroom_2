# Project Walkthrough: Industrial ERP System (PERN Stack)

We have built, verified, and documented the end-to-end Enterprise Resource Planning (ERP) application for industrial manufacturing and supply, addressing every requirement in the technical case study.

$$\textbf{Customer Enquiry} \longrightarrow \textbf{Quotation} \longrightarrow \textbf{Sales Order} \longrightarrow \textbf{Inventory Reservation} \longrightarrow \textbf{Dispatch}$$

---

## What Was Built

### 1. Relational Database & Architecture (PostgreSQL)
- **File**: `backend/src/db/schema.sql` & `docs/schema.md`
- **Entities**: `users`, `customers`, `products`, `inventory`, `enquiries`, `enquiry_items`, `quotations`, `quotation_items`, `sales_orders`, `sales_order_items`, `dispatches`, `dispatch_items`.
- **Relational Integrity**: Strict Foreign Keys with `ON DELETE RESTRICT`, 1-to-1 unique constraints between Quotations and Sales Orders, and between Sales Orders and Dispatches.
- **Constraints**: 
  - `CHECK (reserved_quantity + damaged_quantity <= physical_quantity)`
  - `CHECK (physical_quantity >= 0)`
  - `CHECK (reserved_quantity >= 0)`
  - `CHECK (damaged_quantity >= 0)`
- **Zero-Config Database Engine**: Uses PostgreSQL (`DATABASE_URL`) when configured, with seamless automated fallback to `@electric-sql/pglite` (genuine PostgreSQL 16 WASM) for instantaneous zero-setup execution out of the box on any developer machine or automated CI pipeline.

### 2. Backend REST APIs & Business Logic (Express.js)
- **Authentication & RBAC**: JWT token issuance, `bcryptjs` password hashing, backend RBAC middleware (`auth.js`, `rbac.js`) ensuring Admin vs Sales User operations are enforced server-side.
- **Customer & Enquiries**: Multi-product line items with demanded quantities (`enquiries.routes.js`).
- **Quotations & Financial Arithmetic**: Line item calculations validated on server:
  $$\text{Base Amount} = \text{Quantity} \times \text{Unit Price}$$
  $$\text{Discount} = \text{Base} \times \left(\frac{\text{Discount \%}}{100}\right)$$
  $$\text{Tax} = (\text{Base} - \text{Discount}) \times \left(\frac{\text{GST \%}}{100}\right)$$
  $$\text{Grand Total} = \sum \text{Line Amounts}$$
- **Quotation State Transitions**: `DRAFT -> SENT -> ACCEPTED / REJECTED`. On `ACCEPTED`, automatically marks the Enquiry as `WON`.
- **Sales Order Conversion**: Enforces that only `ACCEPTED` quotations can generate orders, and rejects duplicate conversions via database unique constraints.
- **Concurrency-Safe Inventory Reservation (`salesOrders.routes.js`)**:
  - Implements pessimistic row-level locking (`SELECT ... FOR UPDATE` inside `BEGIN ... COMMIT`).
  - Available stock check: $\text{Available} = \text{Physical} - \text{Reserved} - \text{Damaged}$.
  - Reserving stock increases `reserved_quantity`; `physical_quantity` remains untouched.
- **Dispatch Engine**:
  - Requires Vehicle Number & Driver Name.
  - Decreases both `physical_quantity` and `reserved_quantity` atomically.
  - Prevents duplicate dispatches or dispatching cancelled/pending orders.

### 3. Interactive Frontend (React + Vite)
- **Design System**: Industrial ERP dashboard aesthetic with clean cards, responsive data tables, modal dialogs, and color-coded status pills (`index.css`).
- **Screen 1 (Login)**: Quick demo credential switcher for instant 1-click evaluation (`LoginPage.jsx`).
- **Screen 2 (Enquiries)**: Multi-product enquiry builder and registry (`EnquiriesPage.jsx`).
- **Screen 3 (Quotations)**: Real-time mathematical preview, status transition controls (`Accept`, `Reject`), and 1-click conversion to Sales Order (`QuotationsPage.jsx`).
- **Screen 4 (Sales Orders & Dispatch)**: Full end-to-end traceability breadcrumbs, Live Stock snapshot bar, Admin "Confirm & Reserve" button, and Dispatch modal (`SalesOrdersPage.jsx`).
- **Live Stock Modal**: Dedicated inspector for Physical, Reserved, Damaged, and Available quantities with real-time refresh (`InventoryModal.jsx`).

### 4. Documentation & Postman
- **Swagger Documentation**: Live OpenAPI 3.0 UI at `http://localhost:5000/api-docs` (`swagger.js`).
- **Postman Collection**: `postman/fundsroom_erp_api.postman_collection.json`.
- **Live Verification Defense Guide**: `docs/live_verification_guide.md` covering damaged stock and order cancellations.
- **Progressive Git Commit History**: 6 structured commits from project initialization to full deployment.

---

## Verification & Test Results

### 1. Automated Integration Tests (`npm test`)
Executed via Jest & Supertest:

```
PASS tests/erp.workflow.test.js
  Full-Stack ERP Technical Case Study Test Suite
    √ Test 1: Quotation total is calculated correctly on backend (Base, Discount, GST, Grand Total) (46 ms)
    √ Test 2: Rejected/Draft quotation cannot create a Sales Order (54 ms)
    √ Test 3: Same quotation cannot generate duplicate Sales Orders (77 ms)
    √ Test 4: Cannot reserve more than available inventory (70 ms)
    √ Test 5: Unauthorized user cannot perform a restricted operation (RBAC) (97 ms)
    √ Bonus Test: Simultaneous inventory reservations ensure database-level race condition prevention (128 ms)
    √ Complete Dispatch Flow: Physical and Reserved stock decrease atomically (95 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        2.779 s
```

### 2. Live HTTP End-to-End Workflow Verification
Executed against the running development servers:
```
1. Logging in as Sales User...
Sales Logged In. Token: OK
2. Fetching Enquiries...
Found enquiries: 1 First: ENQ-2026-0001
3. Creating Quotation against enquiry...
Quotation Created: QT-2026-0001 Total: Rs 50445 Status: DRAFT
4. Accepting Quotation...
Quotation Status now: ACCEPTED
5. Converting Accepted Quotation to Sales Order...
Sales Order Created: SO-2026-0001 Status: PENDING
6. Sales user trying to confirm order (Must fail 403)...
Sales Confirm HTTP status: 403 (Expected 403 Forbidden)
7. Logging in as Admin...
8. Stock BEFORE confirmation:
Product 1: Physical=100, Reserved=30, Avail=70
9. Admin confirming order (Reserving stock)...
Confirmed message: Sales Order confirmed successfully and inventory reserved
10. Stock AFTER confirmation:
Product 1: Physical=100, Reserved=40, Avail=60
11. Admin processing dispatch...
Dispatch Created: DSP-2026-0001 Vehicle: MH-12-AB-9876
12. Stock AFTER dispatch:
Product 1: Physical=90, Reserved=30, Avail=60

>>> ALL E2E WORKFLOW CHECKS PASSED WITH 100% SUCCESS! <<<
```

---

## Evaluation Credentials & Quick URLs

- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api`
- **Swagger Documentation**: `http://localhost:5000/api-docs`
- **Admin Login**: `admin@erp.com` / `Admin@123`
- **Sales User Login**: `sales@erp.com` / `Sales@123`
