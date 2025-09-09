const express = require('express');
const { query, transaction } = require('../config/database');
const Joi = require('joi');

const router = express.Router();

// Schema validazione per tempo
const tempoSchema = Joi.object({
  cronometraggio_id: Joi.number().integer().required(),
  bib: Joi.string().max(50).optional().allow(''),
  tempo_arrivo: Joi.date().iso().required(),
  tempo_millisecondi: Joi.number().integer().min(0).required(),
  note: Joi.string().max(500).optional().allow('')
});

// Funzione per calcolare gap
const calcolaGap = async (cronometraggioId, tempoMillisecondi) => {
  // Ottieni il tempo del primo classificato
  const primoResult = await query(`
    SELECT MIN(tempo_millisecondi) as tempo_primo
    FROM tempi 
    WHERE cronometraggio_id = $1
  `, [cronometraggioId]);

  const tempoPrimo = primoResult.rows[0].tempo_primo;
  const gapPrimo = tempoPrimo ? tempoMillisecondi - tempoPrimo : 0;

  // Ottieni il tempo del precedente (quello immediatamente più veloce)
  const precedenteResult = await query(`
    SELECT MAX(tempo_millisecondi) as tempo_precedente
    FROM tempi 
    WHERE cronometraggio_id = $1 AND tempo_millisecondi < $2
  `, [cronometraggioId, tempoMillisecondi]);

  const tempoPrecedente = precedenteResult.rows[0].tempo_precedente;
  const gapPrecedente = tempoPrecedente ? tempoMillisecondi - tempoPrecedente : 0;

  return { gapPrimo, gapPrecedente };
};

// GET /api/tempi/:cronometraggioId - Ottieni tutti i tempi per un cronometraggio
router.get('/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    const { search, orderBy = 'tempo_millisecondi', orderDir = 'ASC' } = req.query;

    let whereClause = 'WHERE cronometraggio_id = $1';
    const params = [cronometraggioId];

    // Filtro di ricerca
    if (search) {
      whereClause += ' AND (bib ILIKE $2 OR note ILIKE $2)';
      params.push(`%${search}%`);
    }

    // Validazione ordinamento
    const allowedOrderBy = ['posizione', 'bib', 'tempo_millisecondi', 'created_at'];
    const allowedOrderDir = ['ASC', 'DESC'];
    
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'tempo_millisecondi';
    const safeOrderDir = allowedOrderDir.includes(orderDir.toUpperCase()) ? orderDir.toUpperCase() : 'ASC';

    const result = await query(`
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY tempo_millisecondi ASC) as posizione_calcolata
      FROM tempi 
      ${whereClause}
      ORDER BY ${safeOrderBy} ${safeOrderDir}
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero tempi:', error);
    res.status(500).json({ error: 'Errore nel recupero dei tempi' });
  }
});

// POST /api/tempi - Aggiungi nuovo tempo
router.post('/', async (req, res) => {
  try {
    const { error, value } = tempoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { cronometraggio_id, bib, tempo_arrivo, tempo_millisecondi, note } = value;

    const result = await transaction(async (client) => {
      // Calcola i gap
      const { gapPrimo, gapPrecedente } = await calcolaGap(cronometraggio_id, tempo_millisecondi);

      // Inserisci il nuovo tempo
      const insertResult = await client.query(`
        INSERT INTO tempi (cronometraggio_id, bib, tempo_arrivo, tempo_millisecondi, gap_primo, gap_precedente, note)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [cronometraggio_id, bib || null, tempo_arrivo, tempo_millisecondi, gapPrimo, gapPrecedente, note || null]);

      // Ricalcola le posizioni e i gap per tutti i tempi del cronometraggio
      await client.query(`
        UPDATE tempi 
        SET posizione = subquery.new_posizione
        FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY tempo_millisecondi ASC) as new_posizione
          FROM tempi 
          WHERE cronometraggio_id = $1
        ) AS subquery
        WHERE tempi.id = subquery.id
      `, [cronometraggio_id]);

      return insertResult;
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore nell\'aggiunta tempo:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta del tempo' });
  }
});

// PUT /api/tempi/:id - Aggiorna tempo esistente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = tempoSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { bib, note } = value;

    const result = await query(`
      UPDATE tempi 
      SET bib = $1, note = $2
      WHERE id = $3
      RETURNING *
    `, [bib || null, note || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tempo non trovato' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore nell\'aggiornamento tempo:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del tempo' });
  }
});

// DELETE /api/tempi/:id - Elimina tempo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Ottieni il cronometraggio_id prima dell'eliminazione
      const tempoResult = await client.query('SELECT cronometraggio_id FROM tempi WHERE id = $1', [id]);
      
      if (tempoResult.rows.length === 0) {
        throw new Error('Tempo non trovato');
      }

      const cronometraggioId = tempoResult.rows[0].cronometraggio_id;

      // Elimina il tempo
      const deleteResult = await client.query('DELETE FROM tempi WHERE id = $1 RETURNING *', [id]);

      // Ricalcola posizioni per tutti i tempi rimanenti
      await client.query(`
        UPDATE tempi 
        SET posizione = subquery.new_posizione
        FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY tempo_millisecondi ASC) as new_posizione
          FROM tempi 
          WHERE cronometraggio_id = $1
        ) AS subquery
        WHERE tempi.id = subquery.id
      `, [cronometraggioId]);

      return deleteResult;
    });

    res.json({ message: 'Tempo eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione tempo:', error);
    if (error.message === 'Tempo non trovato') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Errore nell\'eliminazione del tempo' });
  }
});

// POST /api/tempi/bulk - Aggiungi tempi multipli (per import CSV)
router.post('/bulk', async (req, res) => {
  try {
    const { cronometraggio_id, tempi } = req.body;

    if (!Array.isArray(tempi) || tempi.length === 0) {
      return res.status(400).json({ error: 'Array di tempi richiesto' });
    }

    const result = await transaction(async (client) => {
      const insertedTempi = [];

      for (const tempo of tempi) {
        const { error, value } = tempoSchema.validate({
          ...tempo,
          cronometraggio_id
        });

        if (error) {
          throw new Error(`Errore validazione tempo: ${error.details[0].message}`);
        }

        const { bib, tempo_arrivo, tempo_millisecondi, note } = value;
        const { gapPrimo, gapPrecedente } = await calcolaGap(cronometraggio_id, tempo_millisecondi);

        const insertResult = await client.query(`
          INSERT INTO tempi (cronometraggio_id, bib, tempo_arrivo, tempo_millisecondi, gap_primo, gap_precedente, note)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [cronometraggio_id, bib || null, tempo_arrivo, tempo_millisecondi, gapPrimo, gapPrecedente, note || null]);

        insertedTempi.push(insertResult.rows[0]);
      }

      // Ricalcola tutte le posizioni
      await client.query(`
        UPDATE tempi 
        SET posizione = subquery.new_posizione
        FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY tempo_millisecondi ASC) as new_posizione
          FROM tempi 
          WHERE cronometraggio_id = $1
        ) AS subquery
        WHERE tempi.id = subquery.id
      `, [cronometraggio_id]);

      return insertedTempi;
    });

    res.status(201).json({ 
      message: `${result.length} tempi aggiunti con successo`,
      tempi: result 
    });
  } catch (error) {
    console.error('Errore nell\'aggiunta bulk tempi:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'aggiunta dei tempi' });
  }
});

// GET /api/tempi/:cronometraggioId/classifiche - Ottieni classifiche
router.get('/:cronometraggioId/classifiche', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    const { categoria } = req.query;

    let whereClause = 'WHERE t.cronometraggio_id = $1';
    const params = [cronometraggioId];

    if (categoria) {
      whereClause += ' AND bl.categoria = $2';
      params.push(categoria);
    }

    const result = await query(`
      SELECT 
        t.*,
        bl.nome_atleta,
        bl.categoria,
        ROW_NUMBER() OVER (ORDER BY t.tempo_millisecondi ASC) as posizione_finale,
        EXTRACT(EPOCH FROM (t.tempo_arrivo - c.ora_partenza)) * 1000 as tempo_gara_ms
      FROM tempi t
      LEFT JOIN bib_list bl ON t.bib = bl.bib AND t.cronometraggio_id = bl.cronometraggio_id
      LEFT JOIN cronometraggi c ON t.cronometraggio_id = c.id
      ${whereClause}
      ORDER BY t.tempo_millisecondi ASC
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero classifica:', error);
    res.status(500).json({ error: 'Errore nel recupero della classifica' });
  }
});

module.exports = router;
