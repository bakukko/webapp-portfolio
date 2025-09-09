module.exports = {
  // Ambiente di test
  testEnvironment: 'node',
  
  // Pattern per trovare i test
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // File da includere nella coverage
  collectCoverageFrom: [
    'routes/**/*.js',
    'config/**/*.js',
    'scripts/init-database.js',
    'server.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  
  // Directory per il report di coverage
  coverageDirectory: 'coverage',
  
  // Formati del report di coverage
  coverageReporters: [
    'text',           // Output console
    'text-summary',   // Riassunto console
    'lcov',          // Per strumenti esterni
    'html',          // Report HTML
    'json'           // Report JSON
  ],
  
  // Soglie di coverage
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files da eseguire prima dei test
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Timeout per i test (10 secondi)
  testTimeout: 10000,
  
  // Output verboso
  verbose: true,
  
  // Configurazione per test watch mode
  watchman: true,
  
  // Pattern per file da ignorare
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/uploads/',
    '/backups/',
    '/logs/',
    '/dist/',
    '/build/'
  ],
  
  // Variabili d'ambiente per i test
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  
  // Configurazione per moduli
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],
  
  // Trasformazioni
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Configurazione per test paralleli
  maxWorkers: '50%',
  
  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Configurazione per test di integrazione
  testSequencer: '<rootDir>/tests/testSequencer.js',
  
  // Reporter personalizzati
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true
      }
    ]
  ],
  
  // Configurazioni specifiche per diversi tipi di test
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/api/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
    }
  ]
};
