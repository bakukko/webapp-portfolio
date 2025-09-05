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

// Homepage ottimizzata per mobile
app.get('/', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Portfolio - Applicazioni web professionali per il lavoro">
    <title>Portfolio webapp</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        line-height: 1.6;
        color: #333;
        padding: 16px;
      }
      
      .container { 
        max-width: 800px; 
        margin: 0 auto; 
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 16px; 
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      
      .header {
        background: linear-gradient(45deg, #007bff, #0056b3);
        color: white;
        padding: 24px;
        text-align: center;
      }
      
      .header h1 { 
        font-size: clamp(1.8rem, 5vw, 2.5rem);
        font-weight: 700;
        margin-bottom: 8px;
      }
      
      .header p {
        opacity: 0.9;
        font-size: 1.1rem;
      }
      
      .content {
        padding: 24px;
      }
      
      .app-grid {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }
      
      .app-card { 
        background: white;
        padding: 24px; 
        border-radius: 12px; 
        border: 1px solid #e0e6ed;
        box-shadow: 0 4px 16px rgba(0,0,0,0.05);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .app-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(45deg, #007bff, #0056b3);
      }
      
      .app-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,123,255,0.15);
      }
      
      .app-card h3 {
        font-size: 1.4rem;
        color: #2c3e50;
        margin-bottom: 12px;
        font-weight: 600;
      }
      
      .app-card p {
        color: #6c757d;
        margin-bottom: 20px;
        font-size: 1rem;
      }
      
      .app-link { 
        display: inline-flex;
        align-items: center;
        background: linear-gradient(45deg, #007bff, #0056b3);
        color: white; 
        padding: 12px 24px; 
        text-decoration: none; 
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.3s ease;
        min-height: 44px;
        justify-content: center;
        width: 100%;
        text-align: center;
      }
      
      .app-link:hover {
        background: linear-gradient(45deg, #0056b3, #004494);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,123,255,0.3);
      }
      
      .app-link:active {
        transform: translateY(0);
      }
      
      .status-indicator {
        display: inline-flex;
        align-items: center;
        background: #d4edda;
        color: #155724;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        margin-bottom: 16px;
      }
      
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #28a745;
        margin-right: 8px;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      .footer {
        text-align: center;
        padding: 24px;
        color: #6c757d;
        border-top: 1px solid #e9ecef;
        background: #f8f9fa;
      }
      
      /* Ottimizzazioni touch per mobile */
      @media (max-width: 768px) {
        body {
          padding: 12px;
        }
        
        .header {
          padding: 20px 16px;
        }
        
        .content {
          padding: 20px 16px;
        }
        
        .app-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }
        
        .app-card {
          padding: 20px 16px;
        }
        
        .app-link {
          padding: 16px 24px;
          font-size: 1.1rem;
          min-height: 48px;
        }
      }
      
      /* Supporto dark mode */
      @media (prefers-color-scheme: dark) {
        body {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        }
        
        .container {
          background: rgba(44, 62, 80, 0.95);
          color: #ecf0f1;
        }
        
        .app-card {
          background: rgba(52, 73, 94, 0.8);
          border-color: #566573;
        }
        
        .app-card h3 {
          color: #ecf0f1;
        }
        
        .footer {
          background: rgba(44, 62, 80, 0.5);
          border-top-color: #566573;
        }
      }
      
      /* Animazione di caricamento */
      .container {
        animation: slideUp 0.6s ease-out;
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header class="header">
        <h1>Portfolio Bakukko</h1>
        <p>Applicazioni web professionali</p>
      </header>
      
      <main class="content">
        <div class="status-indicator">
          <span class="status-dot"></span>
          Sistema attivo e aggiornato
        </div>
        
        <div class="app-grid">
          <article class="app-card">
            <h3>🔐 Password Generator</h3>
            <p>Generatore di password sicure con opzioni avanzate ed export CSV per gestire le tue credenziali in modo professionale.</p>
            <a href="https://app1.rossettimauro.work" class="app-link" target="_blank" rel="noopener">
              Apri Applicazione
            </a>
          </article>
          
          <!-- Puoi aggiungere altre app qui -->
          <article class="app-card">
            <h3>🚀 Prossime App</h3>
            <p>Nuove applicazioni in sviluppo. Resta aggiornato per scoprire i prossimi strumenti professionali.</p>
            <div class="app-link" style="background: #6c757d; cursor: not-allowed;">
              In Arrivo
            </div>
          </article>
        </div>
      </main>
      
      <footer class="footer">
        <p>&copy; 2025 Portfolio - Sviluppo professionale</p>
      </footer>
    </div>
    
    <script>
      // Service Worker per PWA (opzionale)
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').catch(function(err) {
            console.log('ServiceWorker registration failed: ', err);
          });
        });
      }
      
      // Gestione touch feedback migliorata
      document.querySelectorAll('.app-link').forEach(link => {
        link.addEventListener('touchstart', function() {
          this.style.transform = 'scale(0.98)';
        });
        
        link.addEventListener('touchend', function() {
          setTimeout(() => {
            this.style.transform = '';
          }, 100);
        });
      });
    </script>
  </body>
  </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Dashboard running on port ' + PORT);
});
