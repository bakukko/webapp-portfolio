const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static('public'));
app.use(express.json());

// Funzione per generare password
function generatePassword(options) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let charset = '';
  if (options.includeLowercase) charset += lowercase;
  if (options.includeUppercase) charset += uppercase;
  if (options.includeNumbers) charset += numbers;
  if (options.includeSymbols) charset += symbols;
  
  if (charset === '') charset = lowercase; // fallback
  
  let password = '';
  for (let i = 0; i < options.length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

// API per generare password
app.post('/api/generate', (req, res) => {
  const { count = 1, ...options } = req.body;
  const passwords = [];
  
  for (let i = 0; i < count; i++) {
    passwords.push({
      id: i + 1,
      password: generatePassword(options),
      length: options.length,
      created: new Date().toISOString()
    });
  }
  
  res.json(passwords);
});

// API per download CSV
app.post('/api/download-csv', (req, res) => {
  const passwords = req.body.passwords || [];
  
  let csv = 'ID,Password,Length,Created\n';
  passwords.forEach(p => {
    csv += `${p.id},"${p.password}",${p.length},"${p.created}"\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="passwords.csv"');
  res.send(csv);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Password Generator running on port ${PORT}`);
});
