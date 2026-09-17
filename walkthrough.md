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

---

## Recent Refinements: UI Button Polish & Downloadable Quotations

1. **Button Glitch Fixes Across All Pages**:
   - **Prevented Text Wrapping in Buttons**: Added `white-space: nowrap;` and `line-height: 1.25` to the `.btn` base class, preventing button text (e.g. "Convert to SO", "Confirm & Reserve", "Download") from awkwardly wrapping onto multiple lines when table space is restricted.
   - **Fixed Icon Warping**: Added `flex-shrink: 0;` to Lucide SVG icons within `.btn` elements to guarantee crisp rendering without oval distortion or collapse.
   - **Table Action Column Stabilization**: Set explicit `minWidth` (`270px` for Quotations, `240px` for Sales Orders) and `white-space: nowrap` on table action headers and cells, wrapped in `.table-actions` flex containers to eliminate ragged, multi-tier row height jumps.
   - **Invalid JSX Style Props**: Replaced legacy string styles `<th style="width: 75px;">` in `QuotationsPage.jsx` with valid React style objects `style={{ width: '80px' }}`, clearing React console warnings and layout recalculation glitches.
   - **Symmetrical Close & Trash Buttons**: Introduced `.btn-icon` and `.btn-icon-danger` (32x32px square) for all modal close (`X`) buttons and item deletion (`Trash2`) buttons, eliminating stretched rectangular pill buttons and keeping disabled trash icons appropriately muted.
   - **Tactile Click Feedback**: Added `:active:not(:disabled)` micro-interactions (`transform: translateY(1px) scale(0.98)`) and `:focus-visible` outline rings for a responsive, modern desktop feel.

2. **Commercial Quotation Download (PDF / Print-Ready)**:
   - Built [`frontend/src/utils/quotationDocument.js`](file:///c:/Users/kanta/OneDrive/Documents/projects/projects/fundsroom%202/frontend/src/utils/quotationDocument.js) supporting 1-click generation of formatted, branded commercial quotations directly from table action bars and modal views with itemized GST breakdown, validity terms, and browser PDF printing.

3. **Blank / White Screen Resolution on Action Buttons**:
   - **Root Cause Identified**: Clicking the **"Download"** action button invoked `window.open('', '_blank')` followed by async document writing. In modern Chrome, calling `window.open` after an asynchronous fetch or with popup blockers resulted in a detached, uninitialized blank tab (URL `localhost:3000`, title `localhost`), shifting focus away from the main application to a blank white screen.
   - **Zero-Window Direct Download**: Replaced `window.open` with a direct `<a download>` Blob download trigger in `quotationDocument.js`. The file `Quotation_QT-XXXX-XXXX.html` now downloads instantly to the user's Downloads folder without opening any blank tabs.
   - **In-Page Print / PDF Trigger**: Added `printQuotationDocument()` utilizing an invisible temporary `iframe` to invoke the native browser Print dialog directly from the active page without leaving or navigating away.
   - **React Error Boundary**: Implemented and wrapped the app in [`frontend/src/components/ErrorBoundary.jsx`](file:///c:/Users/kanta/OneDrive/Documents/projects/projects/fundsroom%202/frontend/src/components/ErrorBoundary.jsx) to intercept any unhandled runtime exceptions and display a recovery card rather than letting React unmount into a blank screen.
   - **Modal Backdrop Refinement**: Softened modal backdrop (`rgba(15, 23, 42, 0.45)`) and added smooth entrance scaling animations in `index.css`.

4. **Dispatch Log & Delivery Challan Synchronization**:
   - **Fixed Undefined API Method**: Resolved `api.apiRequest is not a function` bug in [`frontend/src/pages/DispatchesPage.jsx`](file:///c:/Users/kanta/OneDrive/Documents/projects/projects/fundsroom%202/frontend/src/pages/DispatchesPage.jsx) by adding `getDispatch: (id) => apiRequest('/dispatches/' + id)` to [`frontend/src/api/client.js`](file:///c:/Users/kanta/OneDrive/Documents/projects/projects/fundsroom%202/frontend/src/api/client.js), enabling smooth line-item inspections for all consignments.
   - **Official Delivery Challan Generator**: Built [`frontend/src/utils/deliveryChallanDocument.js`](file:///c:/Users/kanta/OneDrive/Documents/projects/projects/fundsroom%202/frontend/src/utils/deliveryChallanDocument.js) featuring branded company headers, vehicle number, driver name, customer delivery destination, line item breakdown, and gate/consignee signature blocks, with both 1-click HTML download and browser Print/PDF export.
   - **Sales Orders to Dispatch Log Syncing**: Added a **Challan** action button on dispatched sales orders and linked the dispatch confirmation dialog so users can immediately jump from a newly confirmed dispatch to its consignment record in the Dispatch Log.
   - **Live Search & Metrics**: Added dynamic real-time search filtering (by Consignment #, Sales Order #, Customer, Vehicle, Driver) and KPI metrics (Total Consignments, Shipped Units, Transport Fleets) in `DispatchesPage.jsx`.



