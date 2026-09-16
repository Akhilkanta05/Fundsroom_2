const { Pool } = require('pg');
const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

let pool = null;
let pgliteInstance = null;
let isPgLite = false;

async function initDb() {
  if (pool || pgliteInstance) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !process.env.USE_PGLITE) {
    try {
      const testPool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 3000,
      });
      await testPool.query('SELECT 1');
      pool = testPool;
      isPgLite = false;
      console.log('Connected to PostgreSQL server via DATABASE_URL');
      return;
    } catch (err) {
      console.warn('Could not connect to external PostgreSQL server:', err.message);
      console.log('Falling back to embedded WebAssembly PostgreSQL (PGlite)...');
    }
  }

  const dataDir = process.env.NODE_ENV === 'test'
    ? undefined // In-memory for isolated tests
    : path.join(__dirname, '../../.pglite_data');

  if (dataDir && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  pgliteInstance = new PGlite(dataDir);
  await pgliteInstance.waitReady;
  isPgLite = true;
  console.log(`Embedded PostgreSQL (PGlite) ready${dataDir ? ` [persisted at ${dataDir}]` : ' [in-memory]'}`);
}

async function query(text, params = []) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (isPgLite) {
    const res = await pgliteInstance.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.affectedRows !== undefined ? res.affectedRows : (res.rows ? res.rows.length : 0),
    };
  } else {
    return pool.query(text, params);
  }
}

// Multi-statement execution (e.g. running full schema.sql scripts)
async function exec(text) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (isPgLite) {
    await pgliteInstance.exec(text);
  } else {
    await pool.query(text);
  }
}

async function getClient() {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (isPgLite) {
    return {
      query: async (text, params = []) => {
        const res = await pgliteInstance.query(text, params);
        return {
          rows: res.rows || [],
          rowCount: res.affectedRows !== undefined ? res.affectedRows : (res.rows ? res.rows.length : 0),
        };
      },
      release: () => {},
    };
  } else {
    const client = await pool.connect();
    return client;
  }
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
}

module.exports = {
  initDb,
  query,
  exec,
  getClient,
  closeDb,
  getIsPgLite: () => isPgLite,
};
