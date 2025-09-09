const { Pool } = require('pg');
require('dotenv').config();

// Configurazione del pool di connessioni PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cronometraggio_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Numero massimo di connessioni nel pool
  idleTimeoutMillis: 30000, // Timeout per connessioni inattive
  connectionTimeoutMillis: 2000, // Timeout per nuove connessioni
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Event listeners per il pool
pool.on('connect', () => {
  console.log('🔗 Nuova connessione al database stabilita');
});

pool.on('error', (err) => {
  console.error('🚨 Errore nel pool di connessioni:', err);
});

// Funzione helper per eseguire query
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query eseguita:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: res.rowCount
      });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Errore query:', error);
    throw error;
  }
};

// Funzione helper per transazioni
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Test della connessione
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Connessione al database testata con successo:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Test connessione fallito:', error.message);
    return false;
  }
};

// Chiusura del pool (per graceful shutdown)
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 Pool di connessioni chiuso');
  } catch (error) {
    console.error('❌ Errore durante la chiusura del pool:', error);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};
