// tests/jest.setup.js
// Configurazione globale per Jest

// Variabili d'ambiente per i test
process.env.NODE_ENV = 'test';
process.env.PORT = '3003'; // Porta diversa per i test
process.env.DB_NAME = 'cronometraggio_test_db';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.SESSION_SECRET = 'test_secret_key';

// Timeout globale per i test
jest.setTimeout(30000);

// Mock console per test più puliti (opzionale)
global.console = {
  ...console,
  // log: jest.fn(), // Disabilita console.log nei test
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Utility globali per i test
global.testUtils = {
  // Helper per creare dati di test
  createTestCronometraggio: () => ({
    nome: `Test Event ${Date.now()}`,
    ora_partenza: new Date().toISOString(),
    note: 'Test cronometraggio per Jest'
  }),
  
  createTestTempo: (cronometraggiId) => ({
    cronometraggio_id: cronometraggiId,
    bib: `T${Math.floor(Math.random() * 1000)}`,
    tempo_arrivo: new Date().toISOString(),
    tempo_millisecondi: Date.now(),
    note: 'Test tempo'
  }),
  
  // Utility per aspettare
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Cleanup database per test
  cleanupDatabase: async () => {
    const { query } = require('../config/database');
    try {
      await query('DELETE FROM tempi WHERE cronometraggio_id IN (SELECT id FROM cronometraggi WHERE nome LIKE \'Test%\')');
      await query('DELETE FROM cronometraggi WHERE nome LIKE \'Test%\'');
      await query('DELETE FROM bib_list WHERE cronometraggio_id IN (SELECT id FROM cronometraggi WHERE nome LIKE \'Test%\')');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
};

// Mock per funzioni del browser (se necessario)
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3003'
  },
  writable: true
});

// Mock fetch per test che non usano supertest
global.fetch = jest.fn();

// Reset mocks tra i test
afterEach(() => {
  jest.clearAllMocks();
});

// Gestione errori non catturati nei test
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
