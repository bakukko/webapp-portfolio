# 🏃‍♂️ Cronometraggio Sportivo - WebApp

Webapp professionale per cronometraggio sportivo ottimizzata per dispositivi mobile, costruita con Node.js, PostgreSQL e tecnologie web moderne.

## 🎯 Caratteristiche Principali

### ⏱️ Cronometraggio
- **Cronometro digitale** con display grande e ben visibile (HH:MM:SS)
- **Registrazione tempi** con un click/tap - feedback audio e vibrazione
- **Sincronizzazione manuale** dell'ora di partenza
- **Gestione multipla cronometraggi** (mantiene automaticamente gli ultimi 5)
- **Auto-save** ogni 30 secondi per prevenire perdita dati

### 👥 Gestione Atleti
- **Input BIB** a posteriori con conferma rapida
- **Note personalizzate** per ogni atleta
- **Import CSV** per liste BIB preesistenti
- **Ricerca e filtri** per trovare rapidamente atleti specifici

### 📊 Risultati e Classifiche
- **Tabella risultati in tempo reale** con posizioni automatiche
- **Calcolo gap** dal primo classificato e dal precedente
- **Statistiche** (totale partecipanti, tempo medio, migliore, ultimo)
- **Ordinamento flessibile** per posizione, BIB, tempo

### 📤 Export e Condivisione
- **Export CSV** con tutti i dati (tempo, gap, note)
- **Export PDF professionale** con intestazione e statistiche
- **Nome file automatico** con data e nome evento

### 📱 Ottimizzazione Mobile
- **Design responsive** mobile-first
- **PWA** installabile come app nativa
- **Offline capability** per funzionalità base
- **Touch-friendly** con pulsanti grandi (min 44px)
- **Modalità schermo intero** per massimizzare visibilità
- **Tema scuro/chiaro** adattabile alle condizioni di luce

## 🚀 Installazione e Setup

### Prerequisiti
- Node.js 16+ 
- PostgreSQL 12+
- Git

### 1. Clone del Repository
```bash
git clone https://github.com/your-username/cronometraggio-sportivo.git
cd cronometraggio-sportivo
```

### 2. Installazione Dipendenze
```bash
npm install
```

### 3. Configurazione Database
```bash
# Crea il database PostgreSQL
createdb cronometraggio_db

# Copia e configura le variabili d'ambiente
cp .env.example .env
# Modifica .env con le tue credenziali database
```

### 4. Inizializzazione Database
```bash
npm run init-db
```

### 5. Avvio Applicazione
```bash
# Sviluppo
npm run dev

# Produzione
npm start
```

L'applicazione sarà disponibile su `http://localhost:3000`

## 📁 Struttura del Progetto

```
cronometraggio-sportivo/
├── config/
│   └── database.js          # Configurazione PostgreSQL
├── routes/
│   ├── cronometraggi.js     # API cronometraggi
│   ├── tempi.js             # API gestione tempi
│   ├── export.js            # API export CSV/PDF
│   └── api.js               # API generiche
├── scripts/
│   └── init-database.js     # Setup database
├── public/
│   ├── index.html           # Frontend principale
│   ├── js/app.js            # JavaScript applicazione
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service Worker
│   └── icons/               # Icone PWA
├── uploads/                 # File temporanei
├── server.js                # Server principale
├── package.json
└── README.md
```

## 🔧 Configurazione

### Variabili d'Ambiente (.env)
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cronometraggio_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development

# Sicurezza
SESSION_SECRET=your_secret_key_here

# Limiti
MAX_CRONOMETRAGGI=5
AUTO_SAVE_INTERVAL=30000
MAX_FILE_SIZE=5242880
```

### Database Schema
Il database utilizza 3 tabelle principali:
- **cronometraggi**: informazioni eventi
- **tempi**: tempi registrati con gap calcolati
- **bib_list**: liste BIB importate

## 📱 Utilizzo

### Workflow Tipico
1. **Crea nuovo cronometraggio** o seleziona esistente
2. **Imposta ora di partenza** (opzionale)
3. **Importa lista BIB** via CSV (opzionale)
4. **Registra tempi** cliccando il pulsante timing principale
5. **Aggiungi BIB** dopo ogni registrazione
6. **Monitora risultati** in tempo reale
7. **Esporta dati** in CSV o PDF

### Shortcut da Tastiera
- **SPAZIO**: Registra tempo
- **ENTER**: Conferma input BIB (quando focused)
- **ESC**: Annulla operazioni/chiudi modal
- **CTRL+F**: Focus ricerca

### Funzionalità PWA
- **Installabile** su home screen
- **Offline** per funzioni base
- **Push notifications** (future)
- **Background sync** (future)

## 🔌 API Endpoints

### Cronometraggi
```
GET    /api/cronometraggi              # Lista cronometraggi
POST   /api/cronometraggi              # Crea nuovo
PUT    /api/cronometraggi/:id          # Aggiorna
DELETE /api/cronometraggi/:id          # Elimina
POST   /api/cronometraggi/:id/reset    # Reset (elimina tutti i tempi)
```

### Tempi
```
GET    /api/tempi/:cronometraggioId    # Lista tempi
POST   /api/tempi                     # Aggiungi tempo
PUT    /api/tempi/:id                 # Aggiorna tempo
DELETE /api/tempi/:id                 # Elimina tempo
POST   /api/tempi/bulk                # Import multipli
```

### Export
```
GET    /api/export/csv/:cronometraggioId    # Download CSV
GET    /api/export/pdf/:cronometraggioId    # Download PDF
POST   /api/upload-csv/:cronometraggioId    # Upload lista BIB
```

## 🛠️ Sviluppo

### Script NPM
```bash
npm start       # Avvia produzione
npm run dev     # Avvia sviluppo (nodemon)
npm run init-db # Inizializza database
npm test        # Esegui test
```

### Tecnologie Utilizzate
- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **PWA**: Service Worker, Web App Manifest
- **Export**: PDFKit, CSV-Writer
- **Sicurezza**: Helmet, CORS, Joi validation

### Database Features
- **Transazioni** per operazioni critiche
- **Indici** per performance ottimali
- **Trigger** per timestamp automatici
- **Cascade delete** per integrità referenziale

## 🚀 Deployment

### Preparazione Produzione
1. Configura variabili d'ambiente produzione
2. Setup database PostgreSQL
3. Configura HTTPS e reverse proxy
4. Imposta backup automatici database

### Suggerimenti Deployment
- Usa **PM2** per gestione processi
- Configura **Nginx** come reverse proxy
- Abilita **SSL/TLS** con Let's Encrypt
- Setup **monitoring** e **logging**

### Docker (Opzionale)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Sicurezza

- **Helmet** per headers sicurezza
- **CORS** configurato per domini specifici
- **Validazione input** con Joi
- **Sessioni** sicure con cookie httpOnly
- **SQL injection** prevenzione con query parametrizzate
- **Rate limiting** su upload file

## 🏆 Performance

- **Compressione** gzip/brotli
- **Caching** intelligente con Service Worker
- **Database pooling** ottimizzato
- **Lazy loading** per tabelle grandi
- **Debouncing** su ricerca e filtri

## 📈 Monitoraggio

### Metriche Disponibili
- **Health check**: `/api/health`
- **System info**: `/api/info`
- **Database status** e timing query
- **Memory usage** e uptime

### Logging
- **Morgan** per HTTP requests
- **Console logging** strutturato
- **Error handling** centralizzato

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📄 Licenza

MIT License - vedi file [LICENSE](LICENSE) per dettagli.

## 📞 Supporto

Per supporto tecnico o domande:
- Apri un **Issue** su GitHub
- Controlla la **documentazione API**
- Verifica i **log dell'applicazione**

---

**Creato con ❤️ per la comunità sportiva italiana** 🇮🇹
