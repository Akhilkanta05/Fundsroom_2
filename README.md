# Industrial ERP System (PERN Stack)

A production-grade Enterprise Resource Planning (ERP) web application covering the complete manufacturing and supply lifecycle:

$$\textbf{Customer Enquiry} \longrightarrow \textbf{Quotation} \longrightarrow \textbf{Sales Order} \longrightarrow \textbf{Inventory Reservation} \longrightarrow \textbf{Dispatch}$$

Built with strict relational modeling, backend concurrency controls (`SELECT ... FOR UPDATE`), server-validated financial arithmetic, role-based access control (RBAC), automated test suites, Swagger documentation, and a responsive React interface.

---

## 1. Tech Stack

- **Frontend**: React.js 18, Vite, Lucide Icons, Modern CSS Design System
- **Backend**: Node.js, Express.js (REST API Architecture)
- **Database**: PostgreSQL with relational constraints, Foreign Keys, and CHECK constraints
- **Database Engine Support**:
  - Direct connection to PostgreSQL via `DATABASE_URL`
  - Zero-configuration embedded WebAssembly PostgreSQL (`@electric-sql/pglite`) for seamless out-of-the-box local testing and automated CI
- **Authentication**: JWT (JSON Web Tokens), `bcryptjs` password hashing
- **Testing**: Jest, Supertest (100% automated integration coverage)
- **API Documentation**: Swagger UI (OpenAPI 3.0) & Postman Collection

---

## 2. Test Login Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **ADMIN** | `admin@erp.com` | `Admin@123` | View all records, manage inventory, confirm sales orders, process dispatches |
| **SALES USER** | `sales@erp.com` | `Sales@123` | Create customers & enquiries, generate quotations, convert accepted quotes to Sales Orders, view stock availability |

> [!TIP]
> Both the Login screen and the top Navigation bar include a **Quick Demo Switcher** button to switch between Admin and Sales User roles with a single click.

---

## 3. Project Setup & Installation

### Prerequisites
- **Node.js**: v18 or higher (tested on Node v24)
- **npm**: v9 or higher

### Clone & Install
```bash
# Clone the repository
git clone <repo-url>
cd "fundsroom 2"

# Install dependencies for both backend and frontend
npm run install:all
```

---

## 4. Database Setup & Seeding

The application connects to an external PostgreSQL database if `DATABASE_URL` is set, or automatically uses embedded PostgreSQL (PGlite) with zero external setup needed.

### Environment Variables
Copy `.env.example` in `backend/` or configure directly:
```bash
PORT=5000
NODE_ENV=development
JWT_SECRET=fundsroom-super-secret-key-2026

# Optional: To connect to an external PostgreSQL server:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fundsroom_erp
```

### Run Migration & Seed
```bash
# Run database migrations (creates schema, foreign keys, and check constraints)
npm run migrate

# Seed 6+ industrial products, initial inventory, users, and customer enquiry
npm run seed
```

---

## 5. Running the Application

You can start the backend and frontend simultaneously or independently:

### Option A: Independent Terminals
```bash
# Terminal 1 - Backend Server (Port 5000)
npm run dev:backend

# Terminal 2 - Frontend Application (Port 3000)
npm run dev:frontend
```

### Option B: Build Frontend & Serve
```bash
npm run build:frontend
npm run start:backend
```

- **Frontend Application**: `http://localhost:3000`
- **Backend Health Check**: `http://localhost:5000/api/health`
- **Swagger Interactive API Documentation**: `http://localhost:5000/api-docs`

---

## 6. Automated Testing (Mandatory Tests + Bonus Concurrency)

Run the full automated test suite with one command:
```bash
npm test
```

### Test Suite Summary (`backend/tests/erp.workflow.test.js`)
- **Test 1**: Quotation total is calculated correctly on backend (Base Amount = Quantity × Unit Price, Trade Discount %, GST %, Line Amount, Grand Total).
- **Test 2**: Rejected or Draft quotation cannot create a Sales Order (enforces state machine validation).
- **Test 3**: Same quotation cannot generate duplicate Sales Orders (unique constraint and relational check).
- **Test 4**: Cannot reserve more than available inventory (prevents over-reservation).
- **Test 5**: Unauthorized user cannot perform restricted operations (RBAC: Sales user rejected with 403 when calling confirm or dispatch; unauthenticated requests rejected with 401).
- **Bonus Test**: Simultaneous inventory reservations (`Promise.all` parallel requests against limited stock: database row locks guarantee exactly one succeeds and the other fails cleanly with HTTP 400).
- **Dispatch Flow Test**: Complete dispatch execution verifying that Physical Quantity and Reserved Quantity decrease atomically.

---

## 7. Business Workflow & State Machine

```
1. Customer Enquiry
   - Customer: Company Name, Contact Person, Mobile, Email, City
   - Multi-product line items with demanded quantities
   - Status: NEW -> QUOTED -> WON / LOST

2. Quotation
   - Generated against Enquiry Reference
   - Server calculates line totals: Base = Qty * Price, Discount, GST, Grand Total
   - Status: DRAFT -> SENT -> ACCEPTED / REJECTED
   - On ACCEPTED: Automatically marks Enquiry as WON

3. Sales Order
   - Converted only from ACCEPTED quotations (1-to-1 unique mapping)
   - Status: PENDING -> CONFIRMED -> DISPATCHED -> CANCELLED

4. Stock Reservation (Admin Only)
   - Triggered on Sales Order confirmation
   - Concurrency protected: Pessimistic row locking (SELECT ... FOR UPDATE)
   - Available = Physical - Reserved - Damaged
   - Physical inventory does NOT decrease; Reserved inventory increases

5. Dispatch (Admin Only)
   - Triggered with Vehicle Number and Driver Name
   - Physical Quantity decreases AND Reserved Quantity decreases
   - Available quantity remains unchanged
   - Duplicate dispatches strictly prevented
```

---

## 8. Database Architecture & ER Diagram

See [docs/schema.md](file:///docs/schema.md) for the full entity-relationship diagram and detailed constraint breakdown.

### Core Entities
1. `users` (id, email, password_hash, role, full_name)
2. `customers` (id, company_name, contact_person, mobile, email, city)
3. `products` (id, product_code, product_name, category, unit, base_price)
4. `inventory` (id, product_id, physical_quantity, reserved_quantity, damaged_quantity)
5. `enquiries` & `enquiry_items`
6. `quotations` & `quotation_items`
7. `sales_orders` & `sales_order_items`
8. `dispatches` & `dispatch_items`

---

## 9. API Documentation & Postman Collection

- **Swagger UI**: Visit `http://localhost:5000/api-docs` when the backend is running.
- **Postman Collection**: Import [postman/fundsroom_erp_api.postman_collection.json](file:///postman/fundsroom_erp_api.postman_collection.json) directly into Postman. Includes preset environments and authentication headers.

---

## 10. Live Verification Defense (Damaged Stock & Cancellation)

See [docs/live_verification_guide.md](file:///docs/live_verification_guide.md) for:
- Detailed formulas for **Damaged Stock**: $\text{Available} = \text{Physical} - \text{Reserved} - \text{Damaged}$.
- Order cancellation and **Reserved Stock release** logic.
- Technical explanation of database row-level locking during high-concurrency races.

---

## 11. Demo Video Recording Script (< 5 Minutes)

1. **Login (0:00 - 0:30)**:
   - Show login screen.
   - Click "Quick Login as Sales User". Point out role indicator badge.
2. **Customer & Enquiry (0:30 - 1:30)**:
   - Navigate to Enquiries tab.
   - Show seeded enquiry `ENQ-2026-0001` for `ABC Engineering Pvt. Ltd.`.
   - Click "View" to display demanded items and current stock availability.
3. **Quotation & Calculation (1:30 - 2:30)**:
   - Click "Quote" on the enquiry.
   - Demonstrate automatic prefill of products.
   - Modify discount % and GST %: highlight real-time calculation verified on server.
   - Click "Save & Generate Quotation" (status: `DRAFT`).
   - Click "Accept" (status transitions to `ACCEPTED`).
   - Click "Convert to SO" (converts to Sales Order `SO-2026-XXXX`).
4. **Role Check & Stock Reservation (2:30 - 3:30)**:
   - Switch to Sales Orders tab.
   - As Sales User, show that "Confirm & Reserve" button is disabled with tooltip "Admin role required".
   - Click "Switch to Admin" in the top navbar.
   - As Admin, click "Confirm & Reserve Stock".
   - Open "Live Stock" modal: show that **Reserved Stock increased**, while **Physical Stock remained unchanged**.
5. **Dispatch & Inventory Deduction (3:30 - 4:30)**:
   - Click "Dispatch" on the confirmed order.
   - Enter Vehicle Number (`MH-12-AB-9876`) and Driver Name (`Ramesh Patil`).
   - Confirm dispatch.
   - Open "Live Stock" modal: show that **both Physical and Reserved stock decreased** by the exact order quantity.
   - Switch to "Dispatches" tab to view completed consignment tracking record.
6. **Automated Tests Run (4:30 - 5:00)**:
   - Switch to terminal and run `npm test`.
   - Display all 7 green test passes including concurrency race condition test.
