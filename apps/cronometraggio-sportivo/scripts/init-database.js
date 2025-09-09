const { Client } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'cronometraggio_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
};

async function initDatabase() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connesso al database PostgreSQL');

    // Creazione tabella cronometraggi
    await client.query(`
      CREATE TABLE IF NOT EXISTS cronometraggi (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        data_creazione TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ora_partenza TIMESTAMP WITH TIME ZONE,
        stato VARCHAR(50) DEFAULT 'attivo',
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Creazione tabella tempi
    await client.query(`
      CREATE TABLE IF NOT EXISTS tempi (
        id SERIAL PRIMARY KEY,
        cronometraggio_id INTEGER REFERENCES cronometraggi(id) ON DELETE CASCADE,
        bib VARCHAR(50),
        tempo_arrivo TIMESTAMP WITH TIME ZONE NOT NULL,
        tempo_millisecondi BIGINT NOT NULL,
        posizione INTEGER,
        gap_primo INTEGER DEFAULT 0,
        gap_precedente INTEGER DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Creazione tabella BIB precaricati
    await client.query(`
      CREATE TABLE IF NOT EXISTS bib_list (
        id SERIAL PRIMARY KEY,
        cronometraggio_id INTEGER REFERENCES cronometraggi(id) ON DELETE CASCADE,
        bib VARCHAR(50) NOT NULL,
        nome_atleta VARCHAR(255),
        categoria VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Creazione indici per performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tempi_cronometraggio_id ON tempi(cronometraggio_id);
      CREATE INDEX IF NOT EXISTS idx_tempi_tempo_millisecondi ON tempi(tempo_millisecondi);
      CREATE INDEX IF NOT EXISTS idx_tempi_bib ON tempi(bib);
      CREATE INDEX IF NOT EXISTS idx_bib_list_cronometraggio_id ON bib_list(cronometraggio_id);
    `);

    // Trigger per aggiornamento automatico updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_cronometraggi_updated_at ON cronometraggi;
      CREATE TRIGGER update_cronometraggi_updated_at 
        BEFORE UPDATE ON cronometraggi 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_tempi_updated_at ON tempi;
      CREATE TRIGGER update_tempi_updated_at 
        BEFORE UPDATE ON tempi 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Inserimento dati di test (opzionale)
    const testCronometraggio = await client.query(`
      INSERT INTO cronometraggi (nome, ora_partenza)
      VALUES ('Test Race', CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING
      RETURNING id
    `);

    console.log('Database inizializzato con successo!');
    console.log('Tabelle create: cronometraggi, tempi, bib_list');
    
  } catch (error) {
    console.error('Errore durante l\'inizializzazione del database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Esegui l'inizializzazione se questo script è chiamato direttamente
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, dbConfig };
