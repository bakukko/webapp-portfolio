const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static('public'));
app.use(express.json());

// Funzione per generare password uniche
function generateUniquePasswords(options) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Caratteri ambigui da escludere se richiesto
  const ambiguousChars = '0O1lI|';
  
  let charset = '';
  if (options.includeLowercase) charset += lowercase;
  if (options.includeUppercase) charset += uppercase;
  if (options.includeNumbers) charset += numbers;
  if (options.includeSymbols) charset += symbols;
  
  // Rimuovi caratteri ambigui se richiesto
  if (options.excludeAmbiguous) {
    for (let char of ambiguousChars) {
      charset = charset.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    }
  }
  
  if (charset === '') charset = 'abcdefghijklmnopqrstuvwxyz'; // fallback
  
  const passwords = new Set(); // Usa Set per garantire unicità
  const prefix = options.prefix || '';
  const maxAttempts = options.count * 10; // Evita loop infiniti
  let attempts = 0;
  
  while (passwords.size < options.count && attempts < maxAttempts) {
    let password = prefix;
    const remainingLength = options.length - prefix.length;
    
    if (remainingLength > 0) {
      for (let i = 0; i < remainingLength; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }
    
    passwords.add(password);
    attempts++;
  }
  
  return Array.from(passwords);
}

// API per generare e scaricare CSV direttamente
app.post('/api/generate-csv', (req, res) => {
  try {
    const options = {
      length: parseInt(req.body.length) || 12,
      count: parseInt(req.body.count) || 1,
      prefix: req.body.prefix || '',
      includeLowercase: req.body.includeLowercase !== false,
      includeUppercase: req.body.includeUppercase !== false,
      includeNumbers: req.body.includeNumbers !== false,
      includeSymbols: req.body.includeSymbols || false,
      excludeAmbiguous: req.body.excludeAmbiguous || false
    };

    // Validazioni
    if (options.count > 10000) {
      return res.status(400).json({ error: 'Massimo 10.000 password per volta' });
    }

    if (options.length < 1 || options.length > 50) {
      return res.status(400).json({ error: 'Lunghezza deve essere tra 1 e 50 caratteri' });
    }

    if (options.prefix.length >= options.length) {
      return res.status(400).json({ error: 'Prefisso troppo lungo' });
    }

    if (!options.includeLowercase && !options.includeUppercase && 
        !options.includeNumbers && !options.includeSymbols) {
      return res.status(400).json({ error: 'Seleziona almeno un tipo di carattere' });
    }
    
    const passwords = generateUniquePasswords(options);
    
    // Crea CSV con solo la lista dei codici (una password per riga)
    const csv = passwords.join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="passwords.csv"');
    res.send(csv);
    
  } catch (error) {
    console.error('Errore generazione password:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Endpoint di test
app.get('/test', (req, res) => {
  res.json({ 
    status: 'Password Generator attivo',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Homepage semplice per test diretto
app.get('/', (req, res) => {
  res.send(`
    <h1>Password Generator API</h1>
    <p>Servizio attivo sulla porta ${PORT}</p>
    <p><a href="/test">Test endpoint</a></p>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Password Generator running on port ${PORT}`);
  console.log('Endpoint disponibile: POST /api/generate-csv');
});
