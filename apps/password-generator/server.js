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
      charset = charset.replace(new RegExp(char, 'g'), '');
    }
  }
  
  if (charset === '') charset = 'abcdefghijklmnopqrstuvwxyz'; // fallback
  
  const passwords = new Set(); // Usa Set per garantire unicità
  const prefix = options.prefix || '';
  
  while (passwords.size < options.count) {
    let password = prefix;
    const remainingLength = options.length - prefix.length;
    
    if (remainingLength > 0) {
      for (let i = 0; i < remainingLength; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }
    
    passwords.add(password);
  }
  
  return Array.from(passwords);
}

// API per generare e scaricare CSV direttamente
app.post('/api/generate-csv', (req, res) => {
  const options = req.body;
  
  try {
    const passwords = generateUniquePasswords(options);
    
    // Crea CSV con solo la lista dei codici (una password per riga)
    let csv = passwords.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="passwords.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Errore nella generazione delle password' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Password Generator running on port ${PORT}`);
});
