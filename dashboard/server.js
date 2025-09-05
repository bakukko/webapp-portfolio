const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.static('public'));

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
      .app-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px; }
      .app-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
      .app-card h3 { margin-top: 0; color: #007bff; }
      .app-card p { color: #666; margin: 10px 0; }
      .app-link { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; transition: background 0.3s; }
      .app-link:hover { background: #0056b3; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Portfolio Webapp - Bakukko</h1>
      <p>Benvenuto nel mio portfolio di applicazioni web. Qui trovi tutte le mie webapp funzionanti.</p>
      
      <div class="app-grid">
        <div class="app-card">
          <h3>Password Generator</h3>
          <p>Generatore di password sicure con opzioni personalizzabili e export CSV.</p>
          <a href="https://app1.rossettimauro.work" class="app-link">Apri App</a>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Dashboard running on port ' + PORT);
});
