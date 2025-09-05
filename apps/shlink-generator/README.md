# Shlink Generator WebApp

Una webapp semplice e moderna per creare short link utilizzando l'API di Shlink.io con generazione automatica di QR code.

## 🚀 Funzionalità

- ✅ Creazione di short link tramite API Shlink.io
- ✅ Slug personalizzati (opzionali)
- ✅ Tag automatico "temporaneo"
- ✅ Generazione QR code ad alta qualità (300 DPI)
- ✅ Download del QR code come PNG
- ✅ Copia rapida del short link negli appunti
- ✅ Interface responsive e moderna
- ✅ Gestione errori completa

## 🛠️ Configurazione

### Prerequisiti
- Node.js (versione 14 o superiore)
- Account Shlink.io configurato

### Installazione

1. Clona il repository:
```bash
git clone <tuo-repository>
cd shlink-webapp
```

2. Installa le dipendenze:
```bash
npm install
```

3. Configura le variabili in `server.js`:
```javascript
const SHLINK_BASE_URL = 'https://endu-l.ink';
const SHLINK_API_KEY = '92d0c9d8-864f-4539-88dd-9c7b37df5f5c';
```

4. Avvia il server:
```bash
npm start
```

Per sviluppo con auto-restart:
```bash
npm run dev
```

## 📁 Struttura del Progetto

```
shlink-webapp/
├── server.js              # Server Express con API endpoints
├── package.json           # Dipendenze e configurazione npm
├── README.md              # Documentazione
└── public/
    └── index.html         # Frontend dell'applicazione
```

## 🔧 API Endpoints

### POST `/api/create-shortlink`
Crea un nuovo short link.

**Body:**
```json
{
  "url": "https://esempio.com",
  "slug": "mio-link-personalizzato"  // opzionale
}
```

**Risposta:**
```json
{
  "success": true,
  "shortUrl": "https://endu-l.ink/abc123",
  "originalUrl": "https://esempio.com",
  "slug": "abc123",
  "qrCode": "data:image/png;base64,..."
}
```

## 🌐 Deploy

### Deploy manuale
1. Carica i file sul tuo server
2. Installa le dipendenze: `npm install --production`
3. Avvia con PM2 o similari: `pm2 start server.js`

### Deploy con GitHub Actions (esempio)
```yaml
name: Deploy to Server
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          # I tuoi comandi di deploy
```

### Variabili d'ambiente
Puoi usare variabili d'ambiente per la configurazione:

```bash
export SHLINK_BASE_URL=https://endu-l.ink
export SHLINK_API_KEY=your-api-key
export PORT=3000
```

E modificare `server.js`:
```javascript
const SHLINK_BASE_URL = process.env.SHLINK_BASE_URL || 'https://endu-l.ink';
const SHLINK_API_KEY = process.env.SHLINK_API_KEY || 'your-api-key';
const PORT = process.env.PORT || 3000;
```

## 🔒 Sicurezza

- L'API key è configurata lato server
- Validazione degli input
- Gestione errori completa
- CORS configurato per sicurezza

## 🐛 Troubleshooting

**Errore 401 - API Key non valida:**
- Verifica che l'API key sia corretta
- Controlla i permessi dell'API key su Shlink

**Errore 409 - Slug già esistente:**
- Il slug personalizzato è già in uso
- Prova con un slug diverso o lascia vuoto per generazione automatica

**Errore di connessione:**
- Verifica che la base URL di Shlink sia corretta
- Controlla la connessione internet
- Verifica che il servizio Shlink sia attivo

## 📝 License

MIT License - vedi LICENSE file per dettagli.

## 🤝 Contributing

1. Fork del progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push sul branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request
