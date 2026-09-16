const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { initDb, exec, closeDb } = require('../config/db');

async function runMigration() {
  try {
    console.log('--- Starting Database Migration ---');
    await initDb();
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

    await exec(schemaSql);
    console.log('Database schema successfully migrated.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
