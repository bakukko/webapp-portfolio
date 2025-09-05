const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:mauross81@postgres:5432/postgres'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
