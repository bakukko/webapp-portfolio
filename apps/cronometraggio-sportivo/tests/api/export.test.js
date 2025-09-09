const request = require('supertest');
const app = require('../../server');
const fs = require('fs');
const path = require('path');

describe('API Export', () => {
  let cronometraggiId;
  let tempoId;

  beforeAll(async () => {
    await global.testUtils.cleanupDatabase();
    
    // Crea cronometraggio di test
    const cronometraggiResponse = await request(app)
      .post('/api/cronometraggi')
      .send({
        nome: 'Test Export Event',
        ora_partenza: new Date().toISOString(),
        note: 'Test per export'
      });
    
    cronometraggiId = cronometraggiResponse.body.id;

    // Aggiungi alcuni tempi di test
    const tempiTest = [
      { bib: 'E001', tempo_millisecondi: 7200000, note: 'Primo' },
      { bib: 'E002', tempo_millisecondi: 7260000, note: 'Secondo' },
      { bib: 'E003', tempo_millisecondi: 7320000, note: 'Terzo' }
    ];

    for (const tempo of tempiTest) {
      const response = await request(app)
        .post('/api/tempi')
        .send({
          cronometraggio_id: cronometraggiId,
          bib: tempo.bib,
          tempo_arrivo: new Date().toISOString(),
          tempo_millisecondi: tempo.tempo_millisecondi,
          note: tempo.note
        });
      
      if (!tempoId) tempoId = response.body.id;
    }
  });

  afterAll(async () => {
    await global.testUtils.cleanupDatabase();
  });

  describe('CSV Export', () => {
    it('dovrebbe esportare CSV con headers corretti', async () => {
      const response = await request(app)
        .get(`/api/export/csv/${cronometraggiId}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.csv');
    });

    it('dovrebbe restituire 404 per cronometraggio inesistente', async () => {
      await request(app)
        .get('/api/export/csv/99999')
        .expect(404);
    });

    it('dovrebbe includere tutti i dati nel CSV', async () => {
      const response = await request(app)
        .get(`/api/export/csv/${cronometraggiId}`)
        .expect(200);

      const csvContent = response.text;
      
      // Verifica che contenga le intestazioni
      expect(csvContent).toContain('Posizione');
      expect(csvContent).toContain('BIB');
      expect(csvContent).toContain('Tempo (HH:MM:SS)');
      expect(csvContent).toContain('Gap Primo');
      
      // Verifica che contenga i dati dei tempi
      expect(csvContent).toContain('E001');
      expect(csvContent).toContain('E002');
      expect(csvContent).toContain('E003');
    });
  });

  describe('PDF Export', () => {
    it('dovrebbe esportare PDF con headers corretti', async () => {
      const response = await request(app)
        .get(`/api/export/pdf/${cronometraggiId}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('.pdf');
    });

    it('dovrebbe restituire 404 per cronometraggio inesistente', async () => {
      await request(app)
        .get('/api/export/pdf/99999')
        .expect(404);
    });

    it('dovrebbe generare PDF non vuoto', async () => {
      const response = await request(app)
        .get(`/api/export/pdf/${cronometraggiId}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(1000); // PDF deve essere ragionevolmente grande
      
      // Verifica che sia un PDF valido (inizia con %PDF)
      const pdfHeader = response.body.slice(0, 4).toString();
      expect(pdfHeader).toBe('%PDF');
    });
  });

  describe('Import CSV BIB', () => {
    it('dovrebbe importare lista BIB da CSV', async () => {
      const csvData = [
        { bib: 'IMP001', nome_atleta: 'Mario Rossi', categoria: 'Senior M' },
        { bib: 'IMP002', nome_atleta: 'Laura Bianchi', categoria: 'Senior F' },
        { bib: 'IMP003', nome_atleta: 'Luca Verdi', categoria: 'Junior M' }
      ];

      const response = await request(app)
        .post(`/api/export/import-csv/${cronometraggiId}`)
        .send({ csvData })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.imported).toBe(3);
      expect(response.body.message).toContain('3 BIB importati');
    });

    it('dovrebbe gestire CSV vuoto', async () => {
      const response = await request(app)
        .post(`/api/export/import-csv/${cronometraggiId}`)
        .send({ csvData: [] })
        .expect(400);

      expect(response.body.error).toContain('Dati CSV richiesti');
    });

    it('dovrebbe sovrascrivere BIB esistenti', async () => {
      // Prima importazione
      const csvData1 = [
        { bib: 'OVR001', nome_atleta: 'Nome Vecchio', categoria: 'Cat1' }
      ];

      await request(app)
        .post(`/api/export/import-csv/${cronometraggiId}`)
        .send({ csvData: csvData1 })
        .expect(200);

      // Seconda importazione (sovrascrive)
      const csvData2 = [
        { bib: 'OVR002', nome_atleta: 'Nome Nuovo', categoria: 'Cat2' }
      ];

      const response = await request(app)
        .post(`/api/export/import-csv/${cronometraggiId}`)
        .send({ csvData: csvData2 })
        .expect(200);

      // Verifica che ci sia solo il nuovo BIB
      const bibListResponse = await request(app)
        .get(`/api/bib-list/${cronometraggiId}`)
        .expect(200);

      expect(bibListResponse.body).toHaveLength(1);
      expect(bibListResponse.body[0].bib).toBe('OVR002');
      expect(bibListResponse.body[0].nome_atleta).toBe('Nome Nuovo');
    });
  });

  describe('BIB List Management', () => {
    beforeEach(async () => {
      // Pulisci e imposta BIB di test
      await request(app)
        .delete(`/api/bib-list/${cronometraggiId}`)
        .expect(200);

      const csvData = [
        { bib: 'LIST001', nome_atleta: 'Atleta Uno', categoria: 'Senior' },
        { bib: 'LIST002', nome_atleta: 'Atleta Due', categoria: 'Junior' }
      ];

      await request(app)
        .post(`/api/export/import-csv/${cronometraggiId}`)
        .send({ csvData });
    });

    it('dovrebbe ottenere lista BIB', async () => {
      const response = await request(app)
        .get(`/api/bib-list/${cronometraggiId}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('bib');
      expect(response.body[0]).toHaveProperty('nome_atleta');
      expect(response.body[0]).toHaveProperty('categoria');
    });

    it('dovrebbe ordinare BIB alfabeticamente', async () => {
      const response = await request(app)
        .get(`/api/bib-list/${cronometraggiId}`)
        .expect(200);

      expect(response.body[0].bib).toBe('LIST001');
      expect(response.body[1].bib).toBe('LIST002');
    });

    it('dovrebbe eliminare lista BIB', async () => {
      const response = await request(app)
        .delete(`/api/bib-list/${cronometraggiId}`)
        .expect(200);

      expect(response.body.message).toContain('Lista BIB eliminata');

      // Verifica eliminazione
      const listResponse = await request(app)
        .get(`/api/bib-list/${cronometraggiId}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(0);
    });
  });

  describe('Backup e Statistiche', () => {
    it('dovrebbe creare backup completo', async () => {
      const response = await request(app)
        .post(`/api/backup/${cronometraggiId}`)
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('cronometraggio');
      expect(response.body).toHaveProperty('tempi');
      expect(response.body).toHaveProperty('bib_list');
      expect(response.body).toHaveProperty('statistics');

      // Verifica contenuto backup
      expect(response.body.cronometraggio.id).toBe(cronometraggiId);
      expect(response.body.tempi.length).toBeGreaterThan(0);
      expect(response.body.statistics).toHaveProperty('totale_partecipanti');
    });

    it('dovrebbe ottenere statistiche avanzate', async () => {
      const response = await request(app)
        .get(`/api/statistics/${cronometraggiId}`)
        .expect(200);

      expect(response.body).toHaveProperty('totale_partecipanti');
      expect(response.body).toHaveProperty('tempo_medio');
      expect(response.body).toHaveProperty('tempo_migliore');
      expect(response.body).toHaveProperty('tempo_peggiore');
      expect(response.body).toHaveProperty('deviazione_standard');
      expect(response.body).toHaveProperty('mediana');
      expect(response.body).toHaveProperty('quartile_1');
      expect(response.body).toHaveProperty('quartile_3');
      expect(response.body).toHaveProperty('distribuzione_fasce_tempo');

      // Verifica che i valori siano numerici
      expect(typeof response.body.tempo_medio).toBe('string'); // Viene dal DB come string
      expect(Array.isArray(response.body.distribuzione_fasce_tempo)).toBe(true);
    });

    it('dovrebbe gestire statistiche per cronometraggio vuoto', async () => {
      // Crea cronometraggio vuoto
      const emptyCronometraggio = await request(app)
        .post('/api/cronometraggi')
        .send({
          nome: 'Empty Test Event',
          ora_partenza: new Date().toISOString()
        });

      const response = await request(app)
        .get(`/api/statistics/${emptyCronometraggio.body.id}`)
        .expect(200);

      expect(response.body.totale_partecipanti).toBe('0');
      expect(response.body.tempo_medio).toBeNull();
      expect(response.body.distribuzione_fasce_tempo).toHaveLength(0);

      // Cleanup
      await request(app)
        .delete(`/api/cronometraggi/${emptyCronometraggio.body.id}`)
        .expect(200);
    });
  });

  describe('Error Handling', () => {
    it('dovrebbe gestire cronometraggio inesistente per backup', async () => {
      await request(app)
        .post('/api/backup/99999')
        .expect(404);
    });

    it('dovrebbe gestire cronometraggio inesistente per statistiche', async () => {
      await request(app)
        .get('/api/statistics/99999')
        .expect(200); // Restituisce statistiche vuote invece di 404
    });

    it('dovrebbe gestire dati CSV malformati', async () => {
      const response = await request(app)
        .post(`/api/export/import-csv/${cronometraggiId}`)
        .send({ csvData: 'invalid data' })
        .expect(400);

      expect(response.body.error).toContain('Dati CSV richiesti');
    });
  });
});
