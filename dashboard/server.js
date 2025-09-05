const express = require('express');
const { exec } = require('child_process');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

// Endpoint webhook per aggiornamenti automatici da GitHub
app.post('/webhook', (req, res) => {
  console.log('Webhook ricevuto da GitHub, aggiornamento in corso...');
  
  exec('cd /app && git pull origin main', (error, stdout, stderr) => {
    if (error) {
      console.error('Errore durante git pull:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
    
    console.log('Git pull completato:', stdout);
    
    // Installa dipendenze se necessario
    exec('cd /app && npm install', (npmError) => {
      if (npmError) {
        console.error('Errore npm install:', npmError);
      }
      
      // Installa dipendenze per password generator
      exec('cd /app/apps/password-generator && npm install', (appNpmError) => {
        if (appNpmError) {
          console.error('Errore npm install app:', appNpmError);
        }
        
        console.log('Dipendenze aggiornate');
        
        // Riavvia le applicazioni dopo 2 secondi
        setTimeout(() => {
          exec('pkill -f "node server.js"', () => {
            console.log('Processi terminati, riavvio in corso...');
            
            // Riavvia dashboard
            exec('cd /app/dashboard && node server.js &', (dashError) => {
              if (dashError) console.error('Errore riavvio dashboard:', dashError);
            });
            
            // Riavvia password generator
            exec('cd /app/apps/password-generator && PORT=3001 node server.js &', (appError) => {
              if (appError) console.error('Errore riavvio app:', appError);
            });
          });
        }, 2000);
      });
    });
    
    res.json({ 
      status: 'success', 
      message: 'Aggiornamento avviato, applicazioni in riavvio...' 
    });
  });
});

// Endpoint per verificare lo stato del webhook
app.get('/webhook-status', (req, res) => {
  res.json({ 
    status: 'active', 
    timestamp: new Date().toISOString() 
  });
});

// Homepage con lista delle webapp
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Portfolio Bakukko</title>
    <style>
      body { 
        font-family: Arial, sans-serif; 
        margin: 40px; 
        background: #f5f5f5; 
      }
      .container { 
        max-width: 800px; 
        margin: 0 auto; 
        background: white; 
        padding: 30px; 
        border-radius: 10px; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
      }
      h1 { 
        color: #333; 
        border-bottom: 3px solid #007bff; 
        padding-bottom: 10px; 
      }
      .app-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
        gap: 20px; 
        margin-top: 20px; 
      }
      .app-card { 
        background: #f8f9fa; 
        padding: 20px; 
        border-radius: 8px; 
        border-left: 4px solid #007bff; 
        transition: transform 0.2s;
      }
      .app-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }
      .app-card h3 { 
        margin-top: 0; 
        color: #007bff; 
      }
      .app-card p { 
        color: #666; 
        margin: 10px 0; 
        line-height: 1.5;
      }
      .app-link { 
        background: #007bff; 
        color: white; 
        padding: 10px 20px; 
        text-decoration: none; 
        border-radius: 5px; 
        display: inline-block; 
        transition: background 0.3s; 
      }
      .app-link:hover { 
        background: #0056b3; 
      }
      .stats {
        background: #e9ecef;
        padding: 15px;
        border-radius: 5px;
        margin-top: 20px;
        text-align: center;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Portfolio Webapp - Bakukko</h1>
      <p>Benvenuto nel mio portfolio di applicazioni web. Qui trovi tutte le mie webapp funzionanti con deploy automatico da GitHub.</p>
      
      <div class="app-grid">
        <div class="app-card">
          <h3>Password Generator</h3>
          <p>Generatore di password sicure e uniche con opzioni personalizzabili. Include esclusione caratteri ambigui, prefissi personalizzati e export CSV diretto.</p>
          <p><strong>Funzionalità:</strong></p>
          <ul>
            <li>Password uniche garantite</li>
            <li>Esclusione caratteri ambigui</li>
            <li>Prefissi personalizzabili</li>
            <li>Export CSV diretto</li>
          </ul>
          <a href="https://app1.rossettimauro.work" class="app-link">Apri Applicazione</a>
        </div>
        
        <!-- Placeholder per future app -->
        <div class="app-card" style="opacity: 0.6;">
          <h3>Prossima App</h3>
          <p>In sviluppo...</p>
          <span style="background: #6c757d; color: white; padding: 5px 10px; border-radius: 3px; font-size: 12px;">COMING SOON</span>
        </div>
      </div>
      
      <div class="stats">
        <p><strong>Sistema:</strong> Deploy automatico attivo | Ultimo aggiornamento: ${new Date().toLocaleString('it-IT')}</p>
      </div>
    </div>
  </body>
  </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Dashboard running on port ' + PORT);
  console.log('Webhook endpoint disponibile su /webhook');
});
