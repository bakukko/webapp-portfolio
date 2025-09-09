const express = require('express');
const { query, transaction } = require('../config/database');
const Joi = require('joi');

const router = express.Router();

// Schema validazione per cronometraggio
const cronometraggiSchema = Joi.object({
  nome: Joi.string().min(1).max(255).required(),
  ora_partenza: Joi.date().iso().optional(),
  note: Joi.string().max(1000).optional().allow('')
});

// GET /api/cronometraggi - Ottieni tutti i cronometraggi (ultimi 5)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.*,
        COUNT(t.id) as numero_partecipanti,
        AVG(t.tempo_millisecondi) as tempo_medio
      FROM cronometraggi c
      LEFT JOIN tempi t ON c.id = t.cronometraggio_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore nel recupero cronometraggi:', error);
    res.status(500).json({ error: 'Errore nel recupero dei cronometraggi' });
  }
});

// GET /api/cronometraggi/:id - Ottieni cronometraggio specifico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        c.*,
        COUNT(t.id) as numero_partecipanti,
        AVG(t.tempo_millisecondi) as tempo_medio,
        MIN(t.tempo_millisecondi) as tempo_primo
      FROM cronometraggi c
      LEFT JOIN tempi t ON c.id = t.cronometraggio_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cronometraggio non trovato' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore nel recupero cronometraggio:', error);
    res.status(500).json({ error: 'Errore nel recupero del cronometraggio' });
  }
});

// POST /api/cronometraggi - Crea nuovo cronometraggio
router.post('/', async (req, res) => {
  try {
    const { error, value } = cronometraggiSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { nome, ora_partenza, note } = value;

    // Verifica limite cronometraggi (mantieni solo gli ultimi 5)
    const countResult = await query('SELECT COUNT(*) FROM cronometraggi');
    const count = parseInt(countResult.rows[0].count);

    if (count >= 5) {
      // Elimina il cronometraggio più vecchio
      await query(`
        DELETE FROM cronometraggi 
        WHERE id = (
          SELECT id FROM cronometraggi 
          ORDER BY created_at ASC 
          LIMIT 1
        )
      `);
    }

    const result = await query(`
      INSERT INTO cronometraggi (nome, ora_partenza, note)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [nome, ora_partenza || null, note || null]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore nella creazione cronometraggio:', error);
    res.status(500).json({ error: 'Errore nella creazione del cronometraggio' });
  }
});

// PUT /api/cronometraggi/:id - Aggiorna cronometraggio
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = cronometraggiSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { nome, ora_partenza, note } = value;

    const result = await query(`
      UPDATE cronometraggi 
      SET nome = $1, ora_partenza = $2, note = $3
      WHERE id = $4
      RETURNING *
    `, [nome, ora_partenza || null, note || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cronometraggio non trovato' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore nell\'aggiornamento cronometraggio:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del cronometraggio' });
  }
});

// DELETE /api/cronometraggi/:id - Elimina cronometraggio
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Elimina prima i tempi associati (per sicurezza, anche se c'è CASCADE)
      await client.query('DELETE FROM tempi WHERE cronometraggio_id = $1', [id]);
      await client.query('DELETE FROM bib_list WHERE cronometraggio_id = $1', [id]);
      
      // Elimina il cronometraggio
      const deleteResult = await client.query(
        'DELETE FROM cronometraggi WHERE id = $1 RETURNING *', 
        [id]
      );
      
      return deleteResult;
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cronometraggio non trovato' });
    }

    res.json({ message: 'Cronometraggio eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione cronometraggio:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del cronometraggio' });
  }
});

// POST /api/cronometraggi/:id/reset - Reset cronometraggio (elimina tutti i tempi)
router.post('/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await transaction(async (client) => {
      // Verifica che il cronometraggio esista
      const checkResult = await client.query('SELECT id FROM cronometraggi WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        throw new Error('Cronometraggio non trovato');
      }

      // Elimina tutti i tempi
      await client.query('DELETE FROM tempi WHERE cronometraggio_id = $1', [id]);
      
      return { success: true };
    });

    res.json({ message: 'Cronometraggio resettato con successo' });
  } catch (error) {
    console.error('Errore nel reset cronometraggio:', error);
    if (error.message === 'Cronometraggio non trovato') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Errore nel reset del cronometraggio' });
  }
});

// GET /api/cronometraggi/:id/statistiche - Ottieni statistiche cronometraggio
router.get('/:id/statistiche', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        COUNT(t.id) as totale_partecipanti,
        AVG(t.tempo_millisecondi) as tempo_medio,
        MIN(t.tempo_millisecondi) as tempo_migliore,
        MAX(t.tempo_millisecondi) as tempo_peggiore,
        MAX(t.created_at) as ultimo_tempo_registrato
      FROM tempi t
      WHERE t.cronometraggio_id = $1
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore nel recupero statistiche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

module.exports = router;
