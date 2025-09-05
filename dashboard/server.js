const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

// Configurazione
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key-here';
const REPO_PATH = process.env.REPO_PATH || '/app';

app.use(express.static('public'));
app.use(express.json());

// Funzione per verificare la firma GitHub
function verifyGitHubSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Endpoint webhook per aggiornamenti automatici da GitHub
app.post('/webhook', (req, res) => {
  console.log('🎯 Webhook ricevuto da GitHub');
  
  // Verifica firma GitHub (se configurata)
  if (WEBHOOK_SECRET !== 'your-secret-key-here') {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    if (!signature || !verifyGitHubSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('❌ Firma webhook non valida');
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }
  }
  
  // Verifica che sia un push sul branch main
  if (req.body.ref !== 'refs/heads/main') {
    console.log('ℹ️ Push non su main branch, ignorato');
    return res.json({ status: 'ignored', message: 'Not main branch' });
  }
  
  console.log('🔄 Inizio git pull...');
  
  const pullCommand = `cd ${REPO_PATH} && git pull origin main`;
  
  exec(pullCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Errore git pull:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ Pull completato:', stdout);
    if (stderr) console.log('⚠️ Stderr:', stderr);
    
    res.json({ 
      status: 'success', 
      message: 'Aggiornamento completato',
      timestamp: new Date().toISOString(),
      stdout: stdout.trim()
    });
  });
});

// Endpoint per verificare lo stato del webhook
app.get('/webhook-status', (req, res) => {
  res.json({ 
    status: 'active',
    webhook_configured: WEBHOOK_SECRET !== 'your-secret-key-here',
    repo_path: REPO_PATH,
    timestamp: new Date().toISOString()
  });
});

// 🆕 NUOVO: Endpoint per pull manuale con interfaccia web
app.get('/manual-pull', (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manual Git Pull - Bakukko</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .container {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 40px;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        text-align: center;
      }
      h1 { color: #2c3e50; margin-bottom: 20px; }
      .btn {
        background: linear-gradient(45deg, #007bff, #0056b3);
        color: white;
        border: none;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        margin: 10px;
        min-width: 200px;
      }
      .btn:hover {
        background: linear-gradient(45deg, #0056b3, #004494);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,123,255,0.3);
      }
      .btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
        transform: none;
      }
      #result {
        margin-top: 20px;
        padding: 20px;
        border-radius: 8px;
        text-align: left;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        display: none;
        white-space: pre-wrap;
        max-height: 300px;
        overflow-y: auto;
      }
      .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
      .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
      .loading { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
      .back-link {
        display: inline-block;
        margin-top: 20px;
        color: #007bff;
        text-decoration: none;
        font-weight: 500;
      }
      .back-link:hover { text-decoration: underline; }
      .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }
      .status-card {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #e9ecef;
      }
      .status-card h3 {
        font-size: 0.9rem;
        color: #6c757d;
        margin-bottom: 5px;
      }
      .status-card p {
        font-weight: 600;
        color: #2c3e50;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🔄 Manual Git Pull</h1>
      <p style="color: #6c757d; margin-bottom: 30px;">
        Aggiorna manualmente il codice dal repository GitHub
      </p>
      
      <div class="status-grid">
        <div class="status-card">
          <h3>Status</h3>
          <p id="systemStatus">Ready</p>
        </div>
        <div class="status-card">
          <h3>Last Update</h3>
          <p id="lastUpdate">-</p>
        </div>
      </div>
      
      <button class="btn" onclick="checkStatus()">📊 Check Status</button>
      <button class="btn" onclick="pullCode()">🚀 Pull Latest Code</button>
      <button class="btn" onclick="viewCommits()">📝 View Last Commits</button>
      
      <div id="result"></div>
      
      <a href="/" class="back-link">← Torna alla Dashboard</a>
    </div>

    <script>
      function showResult(content, type = 'loading') {
        const result = document.getElementById('result');
        result.className = type;
        result.textContent = content;
        result.style.display = 'block';
      }

      function updateStatus(status, time = null) {
        document.getElementById('systemStatus').textContent = status;
        if (time) {
          document.getElementById('lastUpdate').textContent = new Date(time).toLocaleString('it-IT');
        }
      }

      async function checkStatus() {
        showResult('Checking system status...', 'loading');
        try {
          const response = await fetch('/api/pull-status');
          const data = await response.json();
          showResult(JSON.stringify(data, null, 2), 'success');
          updateStatus(data.status, data.timestamp);
        } catch (error) {
          showResult('Error: ' + error.message, 'error');
        }
      }

      async function pullCode() {
        const btn = event.target;
        btn.disabled = true;
        btn.textContent = '🔄 Pulling...';
        
        showResult('Starting git pull operation...\\nThis may take a few seconds...', 'loading');
        updateStatus('Updating...');
        
        try {
          const response = await fetch('/api/manual-pull', { method: 'POST' });
          const data = await response.json();
          
          if (data.status === 'success') {
            showResult('✅ Pull completed successfully!\\n\\n' + data.stdout, 'success');
            updateStatus('Updated', data.timestamp);
          } else {
            showResult('❌ Pull failed:\\n\\n' + data.message, 'error');
            updateStatus('Error');
          }
        } catch (error) {
          showResult('❌ Network error:\\n\\n' + error.message, 'error');
          updateStatus('Error');
        } finally {
          btn.disabled = false;
          btn.textContent = '🚀 Pull Latest Code';
        }
      }

      async function viewCommits() {
        showResult('Loading recent commits...', 'loading');
        try {
          const response = await fetch('/api/recent-commits');
          const data = await response.json();
          showResult('📝 Recent commits:\\n\\n' + data.commits, 'success');
        } catch (error) {
          showResult('Error loading commits: ' + error.message, 'error');
        }
      }

      // Auto-check status on load
      window.addEventListener('load', checkStatus);
    </script>
  </body>
  </html>
  `);
});

// 🆕 NUOVO: API endpoint per pull manuale
app.post('/api/manual-pull', (req, res) => {
  console.log('🔄 Manual pull richiesto via web interface');
  
  const pullCommand = `cd ${REPO_PATH} && git pull origin main`;
  
  exec(pullCommand, (error, stdout, stderr) => {
    const timestamp = new Date().toISOString();
    
    if (error) {
      console.error('❌ Errore manual pull:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: error.message,
        stderr: stderr,
        timestamp: timestamp
      });
    }
    
    console.log('✅ Manual pull completato:', stdout);
    res.json({ 
      status: 'success', 
      message: 'Pull completato con successo',
      stdout: stdout.trim(),
      stderr: stderr,
      timestamp: timestamp
    });
  });
});

// 🆕 NUOVO: API endpoint per status
app.get('/api/pull-status', (req, res) => {
  exec(`cd ${REPO_PATH} && git log -1 --pretty=format:"%h %s (%cr) - %an"`, (error, stdout) => {
    res.json({
      status: error ? 'error' : 'ready',
      last_commit: stdout || 'N/A',
      repo_path: REPO_PATH,
      timestamp: new Date().toISOString(),
      error: error ? error.message : null
    });
  });
});

// 🆕 NUOVO: API endpoint per recent commits
app.get('/api/recent-commits', (req, res) => {
  exec(`cd ${REPO_PATH} && git log -5 --pretty=format:"%h %s (%cr) - %an"`, (error, stdout) => {
    res.json({
      status: error ? 'error' : 'success',
      commits: stdout || 'No commits found',
      timestamp: new Date().toISOString()
    });
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
    <meta name="description" content="Portfolio Bakukko - Applicazioni web professionali">
    <title>Portfolio Bakukko</title>
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
      
      .admin-link {
        background: #ffc107;
        color: #212529;
        padding: 8px 16px;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 600;
        display: inline-block;
        margin-top: 16px;
        transition: all 0.3s ease;
      }
      
      .admin-link:hover {
        background: #e0a800;
        transform: translateY(-1px);
      }
      
      @media (max-width: 768px) {
        body { padding: 12px; }
        .header { padding: 20px 16px; }
        .content { padding: 20px 16px; }
        .app-grid { grid-template-columns: 1fr; gap: 16px; }
        .app-card { padding: 20px 16px; }
        .app-link { padding: 16px 24px; font-size: 1.1rem; min-height: 48px; }
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
          Auto-deploy attivo
        </div>
        
        <div class="app-grid">
          <article class="app-card">
            <h3>🔐 Password Generator</h3>
            <p>Generatore di password sicure con opzioni avanzate ed export CSV per gestire le tue credenziali in modo professionale.</p>
            <a href="https://app1.rossettimauro.work" class="app-link" target="_blank" rel="noopener">
              Apri Applicazione
            </a>
          </article>
          
          <article class="app-card">
            <h3>⚙️ Admin Panel</h3>
            <p>Pannello di controllo per gestire deployments, visualizzare commit e fare pull manuali del codice.</p>
            <a href="/manual-pull" class="admin-link">
              🔄 Manual Pull & Status
            </a>
          </article>
        </div>
      </main>
    </div>
  </body>
  </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dashboard running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔄 Manual pull: http://localhost:${PORT}/manual-pull`);
  console.log(`🔐 Webhook security: ${WEBHOOK_SECRET !== 'your-secret-key-here' ? 'ENABLED' : 'DISABLED'}`);
});
