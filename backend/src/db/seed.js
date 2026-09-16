const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const { initDb, query, closeDb } = require('../config/db');

async function seed() {
  try {
    console.log('--- Seeding Database ---');
    await initDb();

    // 1. Seed Users
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const salesPasswordHash = await bcrypt.hash('Sales@123', 10);

    await query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES 
        ($1, $2, 'ADMIN', 'System Administrator'),
        ($3, $4, 'SALES', 'Rajesh Sharma (Sales Exec)')
       ON CONFLICT (email) DO NOTHING`,
      ['admin@erp.com', adminPasswordHash, 'sales@erp.com', salesPasswordHash]
    );
    console.log('Users seeded: admin@erp.com / Admin@123 and sales@erp.com / Sales@123');

    // 2. Seed Customers
    const customerRes = await query(
      `INSERT INTO customers (company_name, contact_person, mobile, email, city)
       VALUES 
        ('ABC Engineering Pvt. Ltd.', 'Vikram Mehta', '+91 98765 43210', 'procurement@abceng.com', 'Pune'),
        ('Precision Heavy Machinery Ltd.', 'Anita Desai', '+91 98230 11223', 'purchases@precisionmach.com', 'Ahmedabad')
       RETURNING id, company_name`
    );
    console.log(`Customers seeded: ${customerRes.rows.length}`);

    // 3. Seed Products
    const productsData = [
      { code: 'PRD-IND-01', name: 'High-Pressure Hydraulic Ball Valve', category: 'Valves', unit: 'PCS', price: 4500.00, physical: 100, reserved: 30 },
      { code: 'PRD-IND-02', name: 'Heavy-Duty Centrifugal Slurry Pump', category: 'Pumps', unit: 'SET', price: 48000.00, physical: 25, reserved: 5 },
      { code: 'PRD-IND-03', name: 'Spherical Roller Bearing 22220', category: 'Bearings', unit: 'PCS', price: 3200.00, physical: 200, reserved: 60 },
      { code: 'PRD-IND-04', name: 'Reinforced Steam Hose 2-inch', category: 'Hoses', unit: 'MTR', price: 850.00, physical: 500, reserved: 120 },
      { code: 'PRD-IND-05', name: 'Double-Acting Pneumatic Cylinder', category: 'Pneumatics', unit: 'PCS', price: 6400.00, physical: 80, reserved: 10 },
      { code: 'PRD-IND-06', name: 'Forged Carbon Steel Flange Class 300', category: 'Flanges', unit: 'PCS', price: 1950.00, physical: 300, reserved: 50 },
    ];

    for (const p of productsData) {
      const pRes = await query(
        `INSERT INTO products (product_code, product_name, category, unit, base_price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (product_code) DO UPDATE 
         SET product_name = EXCLUDED.product_name, base_price = EXCLUDED.base_price
         RETURNING id`,
        [p.code, p.name, p.category, p.unit, p.price]
      );
      const productId = pRes.rows[0].id;

      await query(
        `INSERT INTO inventory (product_id, physical_quantity, reserved_quantity, damaged_quantity)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (product_id) DO UPDATE 
         SET physical_quantity = EXCLUDED.physical_quantity, reserved_quantity = EXCLUDED.reserved_quantity`,
        [productId, p.physical, p.reserved]
      );
    }
    console.log(`Products & Inventory seeded: ${productsData.length} items`);

    // 4. Seed a Sample Customer Enquiry (as depicted on Page 2)
    const abcCustomer = customerRes.rows.find(c => c.company_name.includes('ABC Engineering')) || customerRes.rows[0];
    const salesUser = (await query(`SELECT id FROM users WHERE role = 'SALES' LIMIT 1`)).rows[0];
    const prodList = (await query(`SELECT id, product_code FROM products ORDER BY id`)).rows;

    if (abcCustomer && salesUser && prodList.length >= 3) {
      const enqRes = await query(
        `INSERT INTO enquiries (enquiry_number, customer_id, enquiry_date, required_date, notes, status, created_by)
         VALUES ('ENQ-2026-0001', $1, CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'Initial project supply enquiry for expansion unit.', 'NEW', $2)
         ON CONFLICT (enquiry_number) DO NOTHING
         RETURNING id`,
        [abcCustomer.id, salesUser.id]
      );

      if (enqRes.rows.length > 0) {
        const enqId = enqRes.rows[0].id;
        await query(
          `INSERT INTO enquiry_items (enquiry_id, product_id, quantity)
           VALUES 
            ($1, $2, 100),
            ($1, $3, 40),
            ($1, $4, 200)`,
          [enqId, prodList[0].id, prodList[1].id, prodList[2].id]
        );
        console.log('Sample enquiry ENQ-2026-0001 seeded with 3 product items.');
      }
    }

    console.log('--- Seeding Completed Successfully ---');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
