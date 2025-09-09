const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

const router = express.Router();

// Configurazione multer per upload file
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo file CSV sono permessi'));
    }
  }
});

// GET /api/health - Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// GET /api/info - Informazioni sistema
router.get('/info', async (req, res) => {
  try {
    const dbResult = await query('SELECT NOW() as db_time');
    
    res.json({
      app: {
        name: 'Cronometraggio Sportivo',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        connected: true,
        server_time: dbResult.rows[0].db_time
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        node_version: process.version
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Errore nel recupero informazioni sistema',
      database: { connected: false }
    });
  }
});

// POST /api/upload-csv/:cronometraggioId - Upload lista BIB da CSV
router.post('/upload-csv/:cronometraggioId', upload.single('csvFile'), async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'File CSV richiesto' });
    }

    const results = [];
    const filePath = req.file.path;

    // Leggi e processa il file CSV
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Normalizza le chiavi (rimuovi spazi, converti in minuscolo)
        const normalizedData = {};
        Object.keys(data).forEach(key => {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
          normalizedData[normalizedKey] = data[key].trim();
        });
        
        // Mappa i campi comuni
        const bibData = {
          bib: normalizedData.bib || normalizedData.numero || normalizedData.pettorale || '',
          nome_atleta: normalizedData.nome || normalizedData.nome_atleta || normalizedData.atleta || '',
          categoria: normalizedData.categoria || normalizedData.cat || ''
        };
        
        if (bibData.bib) {
          results.push(bibData);
        }
      })
      .on('end', async () => {
        try {
          // Elimina il file temporaneo
          fs.unlinkSync(filePath);
          
          if (results.length === 0) {
            return res.status(400).json({ error: 'Nessun dato valido trovato nel CSV' });
          }

          // Elimina BIB esistenti per questo cronometraggio
          await query('DELETE FROM bib_list WHERE cronometraggio_id = $1', [cronometraggioId]);

          // Inserisci i nuovi BIB
          for (const bibData of results) {
            await query(`
              INSERT INTO bib_list (cronometraggio_id, bib, nome_atleta, categoria)
              VALUES ($1, $2, $3, $4)
            `, [cronometraggioId, bibData.bib, bibData.nome_atleta || null, bibData.categoria || null]);
          }

          res.json({
            message: `${results.length} BIB importati con successo`,
            imported: results.length,
            data: results.slice(0, 5) // Mostra solo i primi 5 per feedback
          });

        } catch (dbError) {
          console.error('Errore database durante import CSV:', dbError);
          res.status(500).json({ error: 'Errore nel salvataggio dei dati' });
        }
      })
      .on('error', (error) => {
        console.error('Errore lettura CSV:', error);
        fs.unlinkSync(filePath); // Pulisci il file temporaneo
        res.status(400).json({ error: 'Errore nella lettura del file CSV' });
      });

  } catch (error) {
    console.error('Errore upload CSV:', error);
    
    // Pulisci il file se esiste
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Errore nell\'upload del file' });
  }
});

// GET /api/bib-list/:cronometraggioId - Ottieni lista BIB
router.get('/bib-list/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    
    const result = await query(`
      SELECT * FROM bib_list 
      WHERE cronometraggio_id = $1 
      ORDER BY bib ASC
    `, [cronometraggioId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero lista BIB:', error);
    res.status(500).json({ error: 'Errore nel recupero della lista BIB' });
  }
});

// DELETE /api/bib-list/:cronometraggioId - Elimina tutta la lista BIB
router.delete('/bib-list/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    
    const result = await query(
      'DELETE FROM bib_list WHERE cronometraggio_id = $1', 
      [cronometraggioId]
    );

    res.json({ 
      message: 'Lista BIB eliminata con successo',
      deleted: result.rowCount 
    });
  } catch (error) {
    console.error('Errore nell\'eliminazione lista BIB:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione della lista BIB' });
  }
});

// POST /api/backup/:cronometraggioId - Crea backup cronometraggio
router.post('/backup/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    
    // Ottieni dati cronometraggio
    const cronometraggiResult = await query(
      'SELECT * FROM cronometraggi WHERE id = $1', 
      [cronometraggioId]
    );
    
    if (cronometraggiResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cronometraggio non trovato' });
    }
    
    // Ottieni tutti i tempi
    const tempiResult = await query(`
      SELECT t.*, bl.nome_atleta, bl.categoria
      FROM tempi t
      LEFT JOIN bib_list bl ON t.bib = bl.bib AND t.cronometraggio_id = bl.cronometraggio_id
      WHERE t.cronometraggio_id = $1
      ORDER BY t.tempo_millisecondi ASC
    `, [cronometraggioId]);
    
    // Ottieni lista BIB
    const bibResult = await query(
      'SELECT * FROM bib_list WHERE cronometraggio_id = $1', 
      [cronometraggioId]
    );
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      cronometraggio: cronometraggiResult.rows[0],
      tempi: tempiResult.rows,
      bib_list: bibResult.rows,
      statistics: {
        totale_partecipanti: tempiResult.rows.length,
        tempo_medio: tempiResult.rows.length > 0 
          ? tempiResult.rows.reduce((sum, t) => sum + t.tempo_millisecondi, 0) / tempiResult.rows.length 
          : 0
      }
    };
    
    res.json(backup);
  } catch (error) {
    console.error('Errore nella creazione backup:', error);
    res.status(500).json({ error: 'Errore nella creazione del backup' });
  }
});

// GET /api/statistics/:cronometraggioId - Statistiche avanzate
router.get('/statistics/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    
    const result = await query(`
      SELECT 
        COUNT(*) as totale_partecipanti,
        AVG(tempo_millisecondi) as tempo_medio,
        MIN(tempo_millisecondi) as tempo_migliore,
        MAX(tempo_millisecondi) as tempo_peggiore,
        STDDEV(tempo_millisecondi) as deviazione_standard,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tempo_millisecondi) as mediana,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY tempo_millisecondi) as quartile_1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY tempo_millisecondi) as quartile_3
      FROM tempi 
      WHERE cronometraggio_id = $1
    `, [cronometraggioId]);
    
    const stats = result.rows[0];
    
    // Aggiungi distribuzione per fasce orarie se ci sono dati
    let distribuzione = [];
    if (parseInt(stats.totale_partecipanti) > 0) {
      const distribuzioneResult = await query(`
        SELECT 
          FLOOR(tempo_millisecondi / 300000) * 5 as fascia_minuti,
          COUNT(*) as numero_atleti
        FROM tempi 
        WHERE cronometraggio_id = $1
        GROUP BY FLOOR(tempo_millisecondi / 300000)
        ORDER BY fascia_minuti
      `, [cronometraggioId]);
      
      distribuzione = distribuzioneResult.rows;
    }
    
    res.json({
      ...stats,
      distribuzione_fasce_tempo: distribuzione
    });
  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

// Error handler per multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File troppo grande (max 5MB)' });
    }
    return res.status(400).json({ error: 'Errore nell\'upload del file' });
  }
  
  if (error.message === 'Solo file CSV sono permessi') {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

module.exports = router;
