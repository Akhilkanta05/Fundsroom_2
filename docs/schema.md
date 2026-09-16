# Industrial ERP - Database Schema & ER Diagram

This document describes the PostgreSQL relational database architecture designed for the Industrial Manufacturing & Supply ERP system.

## Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ ENQUIRIES : "logs"
    USERS ||--o{ QUOTATIONS : "prepares"
    USERS ||--o{ SALES_ORDERS : "creates"
    USERS ||--o{ SALES_ORDERS : "confirms (admin)"
    USERS ||--o{ DISPATCHES : "dispatches (admin)"

    CUSTOMERS ||--o{ ENQUIRIES : "places"
    CUSTOMERS ||--o{ QUOTATIONS : "receives"
    CUSTOMERS ||--o{ SALES_ORDERS : "orders"

    PRODUCTS ||--|| INVENTORY : "tracked in"
    PRODUCTS ||--o{ ENQUIRY_ITEMS : "included in"
    PRODUCTS ||--o{ QUOTATION_ITEMS : "quoted in"
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : "ordered in"
    PRODUCTS ||--o{ DISPATCH_ITEMS : "dispatched in"

    ENQUIRIES ||--o{ ENQUIRY_ITEMS : "contains"
    ENQUIRIES ||--o{ QUOTATIONS : "referenced by"

    QUOTATIONS ||--o{ QUOTATION_ITEMS : "contains"
    QUOTATIONS ||--o| SALES_ORDERS : "converted to (1-to-1)"

    SALES_ORDERS ||--o{ SALES_ORDER_ITEMS : "contains"
    SALES_ORDERS ||--o| DISPATCHES : "fulfilled by (1-to-1)"

    DISPATCHES ||--o{ DISPATCH_ITEMS : "contains"

    USERS {
        int id PK
        string email UK
        string password_hash
        string role "ADMIN | SALES"
        string full_name
        timestamp created_at
    }

    CUSTOMERS {
        int id PK
        string company_name
        string contact_person
        string mobile
        string email
        string city
        timestamp created_at
    }

    PRODUCTS {
        int id PK
        string product_code UK
        string product_name
        string category
        string unit
        numeric base_price
        timestamp created_at
    }

    INVENTORY {
        int id PK
        int product_id FK,UK
        numeric physical_quantity
        numeric reserved_quantity
        numeric damaged_quantity
        timestamp updated_at
    }

    ENQUIRIES {
        int id PK
        string enquiry_number UK
        int customer_id FK
        date enquiry_date
        date required_date
        text notes
        string status "NEW | QUOTED | WON | LOST"
        int created_by FK
        timestamp created_at
    }

    ENQUIRY_ITEMS {
        int id PK
        int enquiry_id FK
        int product_id FK
        numeric quantity
        timestamp created_at
    }

    QUOTATIONS {
        int id PK
        string quotation_number UK
        int enquiry_id FK
        int customer_id FK
        numeric grand_total
        date valid_until
        string status "DRAFT | SENT | ACCEPTED | REJECTED"
        int created_by FK
        timestamp created_at
    }

    QUOTATION_ITEMS {
        int id PK
        int quotation_id FK
        int product_id FK
        numeric quantity
        numeric unit_price
        numeric discount_percent
        numeric gst_percent
        numeric line_amount
    }

    SALES_ORDERS {
        int id PK
        string order_number UK
        int quotation_id FK,UK
        int customer_id FK
        date order_date
        numeric total_amount
        string status "PENDING | CONFIRMED | DISPATCHED | CANCELLED"
        int created_by FK
        int confirmed_by FK
        timestamp confirmed_at
        timestamp created_at
    }

    SALES_ORDER_ITEMS {
        int id PK
        int sales_order_id FK
        int product_id FK
        numeric quantity
        numeric unit_price
        numeric line_amount
    }

    DISPATCHES {
        int id PK
        string dispatch_number UK
        int sales_order_id FK,UK
        date dispatch_date
        string vehicle_number
        string driver_name
        text notes
        int dispatched_by FK
        timestamp created_at
    }

    DISPATCH_ITEMS {
        int id PK
        int dispatch_id FK
        int product_id FK
        numeric quantity
    }
```

---

## Relational Constraints & Business Rules

1. **Unique Constraints**:
   - `users.email` is UNIQUE.
   - `products.product_code` is UNIQUE.
   - `enquiries.enquiry_number` is UNIQUE.
   - `quotations.quotation_number` is UNIQUE.
   - `sales_orders.order_number` is UNIQUE.
   - `sales_orders.quotation_id` is UNIQUE: **Guarantees at database level that the same quotation cannot generate duplicate Sales Orders.**
   - `dispatches.dispatch_number` is UNIQUE.
   - `dispatches.sales_order_id` is UNIQUE: **Guarantees duplicate dispatch of the same order is impossible.**

2. **Foreign Key Integrity**:
   - Deletion of Customers or Products referenced by existing transactions is restricted (`ON DELETE RESTRICT`).
   - Cascade deletes apply only to direct child line items (`enquiry_items`, `quotation_items`, `sales_order_items`, `dispatch_items`).

3. **Check Constraints**:
   - `inventory`: `CHECK (physical_quantity >= 0)`
   - `inventory`: `CHECK (reserved_quantity >= 0)`
   - `inventory`: `CHECK (damaged_quantity >= 0)`
   - `inventory`: `CHECK (reserved_quantity + damaged_quantity <= physical_quantity)`: **Prevents negative available inventory at database level.**
   - `quotation_items`: `CHECK (discount_percent >= 0 AND discount_percent <= 100)`
   - `quotation_items`: `CHECK (gst_percent >= 0 AND gst_percent <= 100)`
   - `quotation_items`: `CHECK (unit_price >= 0)`
