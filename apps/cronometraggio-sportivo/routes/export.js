const express = require('express');
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');

const router = express.Router();

// Funzione per formattare il tempo da millisecondi a HH:MM:SS
const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// GET /api/export/csv/:cronometraggioId - Export CSV
router.get('/csv/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;

    // Ottieni dati del cronometraggio
    const cronometraggiResult = await query(`
      SELECT nome, data_creazione, ora_partenza
      FROM cronometraggi 
      WHERE id = $1
    `, [cronometraggioId]);

    if (cronometraggiResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cronometraggio non trovato' });
    }

    const cronometraggio = cronometraggiResult.rows[0];

    // Ottieni tutti i tempi
    const tempiResult = await query(`
      SELECT 
        t.*,
        bl.nome_atleta,
        bl.categoria,
        ROW_NUMBER() OVER (ORDER BY t.tempo_millisecondi ASC) as posizione
      FROM tempi t
      LEFT JOIN bib_list bl ON t.bib = bl.bib AND t.cronometraggio_id = bl.cronometraggio_id
      WHERE t.cronometraggio_id = $1
      ORDER BY t.tempo_millisecondi ASC
    `, [cronometraggioId]);

    // Prepara i dati per il CSV
    const csvData = tempiResult.rows.map(tempo => ({
      posizione: tempo.posizione,
      bib: tempo.bib || '',
      nome_atleta: tempo.nome_atleta || '',
      categoria: tempo.categoria || '',
      tempo_formattato: formatTime(tempo.tempo_millisecondi),
      tempo_millisecondi: tempo.tempo_millisecondi,
      gap_primo_ms: tempo.gap_primo,
      gap_primo_formattato: formatTime(tempo.gap_primo),
      gap_precedente_ms: tempo.gap_precedente,
      gap_precedente_formattato: formatTime(tempo.gap_precedente),
      note: tempo.note || '',
      tempo_arrivo: tempo.tempo_arrivo.toISOString()
    }));

    // Crea il nome del file
    const fileName = `${cronometraggio.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    // Assicurati che la directory uploads esista
    const uploadsDir = path.dirname(filePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Configura il writer CSV
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'posizione', title: 'Posizione' },
        { id: 'bib', title: 'BIB' },
        { id: 'nome_atleta', title: 'Nome Atleta' },
        { id: 'categoria', title: 'Categoria' },
        { id: 'tempo_formattato', title: 'Tempo (HH:MM:SS)' },
        { id: 'tempo_millisecondi', title: 'Tempo (ms)' },
        { id: 'gap_primo_formattato', title: 'Gap Primo (HH:MM:SS)' },
        { id: 'gap_primo_ms', title: 'Gap Primo (ms)' },
        { id: 'gap_precedente_formattato', title: 'Gap Precedente (HH:MM:SS)' },
        { id: 'gap_precedente_ms', title: 'Gap Precedente (ms)' },
        { id: 'note', title: 'Note' },
        { id: 'tempo_arrivo', title: 'Timestamp Arrivo' }
      ]
    });

    // Scrivi il file CSV
    await csvWriter.writeRecords(csvData);

    // Invia il file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Errore nel download CSV:', err);
        res.status(500).json({ error: 'Errore nel download del file' });
      }
      
      // Elimina il file temporaneo dopo il download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 60000); // Elimina dopo 1 minuto
    });

  } catch (error) {
    console.error('Errore nell\'export CSV:', error);
    res.status(500).json({ error: 'Errore nell\'export CSV' });
  }
});

// GET /api/export/pdf/:cronometraggioId - Export PDF
router.get('/pdf/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;

    // Ottieni dati del cronometraggio
    const cronometraggiResult = await query(`
      SELECT nome, data_creazione, ora_partenza, note
      FROM cronometraggi 
      WHERE id = $1
    `, [cronometraggioId]);

    if (cronometraggiResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cronometraggio non trovato' });
    }

    const cronometraggio = cronometraggiResult.rows[0];

    // Ottieni tutti i tempi e statistiche
    const tempiResult = await query(`
      SELECT 
        t.*,
        bl.nome_atleta,
        bl.categoria,
        ROW_NUMBER() OVER (ORDER BY t.tempo_millisecondi ASC) as posizione
      FROM tempi t
      LEFT JOIN bib_list bl ON t.bib = bl.bib AND t.cronometraggio_id = bl.cronometraggio_id
      WHERE t.cronometraggio_id = $1
      ORDER BY t.tempo_millisecondi ASC
    `, [cronometraggioId]);

    // Calcola statistiche
    const totalPartecipanti = tempiResult.rows.length;
    const tempoMedio = totalPartecipanti > 0 
      ? tempiResult.rows.reduce((sum, t) => sum + t.tempo_millisecondi, 0) / totalPartecipanti
      : 0;

    // Crea il documento PDF
    const doc = new PDFDocument({ margin: 50 });
    const fileName = `${cronometraggio.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    // Assicurati che la directory uploads esista
    const uploadsDir = path.dirname(filePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Stream del PDF
    doc.pipe(fs.createWriteStream(filePath));

    // Header del documento
    doc.fontSize(20).text('RISULTATI CRONOMETRAGGIO', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text(`Evento: ${cronometraggio.nome}`, { align: 'center' });
    doc.fontSize(12).text(`Data: ${new Date(cronometraggio.data_creazione).toLocaleDateString('it-IT')}`, { align: 'center' });
    
    if (cronometraggio.ora_partenza) {
      doc.text(`Ora partenza: ${new Date(cronometraggio.ora_partenza).toLocaleTimeString('it-IT')}`, { align: 'center' });
    }
    
    doc.moveDown(2);

    // Statistiche
    doc.fontSize(14).text('STATISTICHE', { underline: true });
    doc.fontSize(11);
    doc.text(`Totale partecipanti: ${totalPartecipanti}`);
    doc.text(`Tempo medio: ${formatTime(tempoMedio)}`);
    
    if (totalPartecipanti > 0) {
      doc.text(`Tempo migliore: ${formatTime(tempiResult.rows[0].tempo_millisecondi)}`);
      doc.text(`Tempo peggiore: ${formatTime(tempiResult.rows[totalPartecipanti - 1].tempo_millisecondi)}`);
    }
    
    doc.moveDown(2);

    // Tabella risultati
    doc.fontSize(14).text('CLASSIFICA', { underline: true });
    doc.moveDown();

    // Header tabella
    const tableTop = doc.y;
    const tableLeft = 50;
    const colWidths = [40, 60, 120, 80, 80, 70, 70];
    
    doc.fontSize(9);
    let currentX = tableLeft;
    
    const headers = ['Pos.', 'BIB', 'Nome', 'Categoria', 'Tempo', 'Gap 1°', 'Gap Prec.'];
    headers.forEach((header, i) => {
      doc.text(header, currentX, tableTop, { width: colWidths[i], align: 'center' });
      currentX += colWidths[i];
    });

    // Linea sotto header
    doc.moveTo(tableLeft, tableTop + 15)
       .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), tableTop + 15)
       .stroke();

    // Righe dati
    let currentY = tableTop + 25;
    
    tempiResult.rows.forEach((tempo, index) => {
      if (currentY > 700) { // Nuova pagina se necessario
        doc.addPage();
        currentY = 50;
      }

      currentX = tableLeft;
      const rowData = [
        tempo.posizione.toString(),
        tempo.bib || '-',
        tempo.nome_atleta || '-',
        tempo.categoria || '-',
        formatTime(tempo.tempo_millisecondi),
        tempo.gap_primo > 0 ? `+${formatTime(tempo.gap_primo)}` : '-',
        tempo.gap_precedente > 0 ? `+${formatTime(tempo.gap_precedente)}` : '-'
      ];

      rowData.forEach((data, i) => {
        doc.text(data, currentX, currentY, { 
          width: colWidths[i], 
          align: i === 2 ? 'left' : 'center',
          height: 12
        });
        currentX += colWidths[i];
      });

      currentY += 15;
    });

    // Footer
    doc.fontSize(8)
       .text(`Generato il ${new Date().toLocaleString('it-IT')}`, 
             50, doc.page.height - 50, { align: 'center' });

    // Finalizza il PDF
    doc.end();

    // Aspetta che il file sia scritto completamente
    doc.on('end', () => {
      // Invia il file
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Errore nel download PDF:', err);
          res.status(500).json({ error: 'Errore nel download del file' });
        }
        
        // Elimina il file temporaneo dopo il download
        setTimeout(() => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }, 60000); // Elimina dopo 1 minuto
      });
    });

  } catch (error) {
    console.error('Errore nell\'export PDF:', error);
    res.status(500).json({ error: 'Errore nell\'export PDF' });
  }
});

// POST /api/export/import-csv/:cronometraggioId - Import lista BIB da CSV
router.post('/import-csv/:cronometraggioId', async (req, res) => {
  try {
    const { cronometraggioId } = req.params;
    const { csvData } = req.body; // Array di oggetti con bib, nome_atleta, categoria

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({ error: 'Dati CSV richiesti' });
    }

    // Elimina eventuali BIB esistenti per questo cronometraggio
    await query('DELETE FROM bib_list WHERE cronometraggio_id = $1', [cronometraggioId]);

    // Inserisci i nuovi BIB
    const insertPromises = csvData.map(row => {
      const { bib, nome_atleta, categoria } = row;
      return query(`
        INSERT INTO bib_list (cronometraggio_id, bib, nome_atleta, categoria)
        VALUES ($1, $2, $3, $4)
      `, [cronometraggioId, bib, nome_atleta || null, categoria || null]);
    });

    await Promise.all(insertPromises);

    res.json({ 
      message: `${csvData.length} BIB importati con successo`,
      imported: csvData.length 
    });

  } catch (error) {
    console.error('Errore nell\'import CSV:', error);
    res.status(500).json({ error: 'Errore nell\'import CSV' });
  }
});

module.exports = router;
