module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Stile del codice
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // Variabili
    'no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    'no-undef': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Best practices
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-alert': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // ES6+
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'arrow-parens': ['error', 'as-needed'],
    'template-curly-spacing': 'error',
    
    // Formatting
    'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
    'comma-dangle': ['error', 'never'],
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-trailing-spaces': 'error',
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Functions
    'func-call-spacing': ['error', 'never'],
    'no-empty-function': 'warn',
    'consistent-return': 'error',
    
    // Async/Await
    'no-async-promise-executor': 'error',
    'require-await': 'warn',
    
    // Security
    'no-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error'
  },
  
  // Configurazioni specifiche per file
  overrides: [
    {
      // File di test
      files: ['**/*.test.js', '**/tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      // File di configurazione
      files: ['*.config.js', '.eslintrc.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      // Frontend JavaScript
      files: ['public/js/**/*.js'],
      env: {
        browser: true,
        es6: true
      },
      globals: {
        // Variabili globali per il frontend
        'tailwind': 'readonly'
      },
      rules: {
        'no-console': 'warn' // Console warning ma non errore nel frontend
      }
    },
    {
      // Script di deployment
      files: ['scripts/**/*.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off',
        'no-process-exit': 'off'
      }
    }
  ],
  
  // Ignora alcuni pattern
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'uploads/',
    'backups/',
    'logs/',
    'dist/',
    'build/',
    '*.min.js',
    'public/sw.js' // Service worker ha sintassi specifica
  ],
  
  // Configurazioni globali
  globals: {
    'process': 'readonly',
    'Buffer': 'readonly',
    '__dirname': 'readonly',
    '__filename': 'readonly',
    'module': 'writable',
    'exports': 'writable',
    'require': 'readonly'
  }
};
