const express = require('express');
const { exec } = require('child_process');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

// Endpoint webhook per aggiornamenti automatici da GitHub
app.post('/webhook', (req, res) => {
  console.log('Webhook ricevuto da GitHub');
  
  exec('cd /app && git pull origin main', (error, stdout, stderr) => {
    if (error) {
      console.error('Errore git pull:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
    
    console.log('Pull completato');
    res.json({ status: 'success', message: 'Aggiornamento completato' });
  });
});

// Endpoint per verificare lo stato
app.get('/webhook-status', (req, res) => {
  res.json({ 
    status: 'active', 
    timestamp: new Date().toISOString() 
  });
});

// Homepage
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Portfolio Bakukko</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
      .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
      .app-card { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #007bff; }
      .app-link { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Portfolio Bakukko</h1>
      <div class="app-card">
        <h3>Password Generator</h3>
        <p>Generatore di password sicure con export CSV</p>
        <a href="https://app1.rossettimauro.work" class="app-link">Apri App</a>
      </div>
    </div>
  </body>
  </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Dashboard running on port ' + PORT);
});
