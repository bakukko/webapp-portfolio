#!/bin/bash

# Deploy script per produzione
set -e

echo "🚀 Avvio deploy cronometraggio sportivo..."

# Controlla se Docker è installato
if ! command -v docker &> /dev/null; then
    echo "❌ Docker non trovato. Installalo prima di continuare."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose non trovato. Installalo prima di continuare."
    exit 1
fi

# Crea file .env se non esiste
if [ ! -f .env ]; then
    echo "📝 Creazione file .env..."
    cp .env.example .env
    echo "⚠️  Ricordati di configurare le variabili in .env"
fi

# Crea directory necessarie
echo "📁 Creazione directory..."
mkdir -p uploads nginx/ssl backups logs

# Build dell'applicazione
echo "🔨 Build dell'applicazione..."
docker-compose build --no-cache

# Avvio servizi
echo "🚀 Avvio servizi..."
docker-compose up -d

# Attendi che i servizi siano pronti
echo "⏳ Attesa avvio servizi..."
sleep 30

# Inizializza il database se necessario
echo "🗃️  Inizializzazione database..."
docker-compose exec app npm run init-db

# Controlla stato servizi
echo "🔍 Controllo stato servizi..."
docker-compose ps

# Test health check
echo "🏥 Test health check..."
curl -f http://localhost:3002/api/health || echo "⚠️  Health check fallito"

echo "✅ Deploy completato!"
echo "📱 App disponibile su: http://localhost:3002"
echo "📊 Database: localhost:5432"
echo ""
echo "📋 Prossimi passi:"
echo "   1. Configura le variabili in .env"
echo "   2. Imposta SSL/TLS per produzione"
echo "   3. Configura backup automatici"
echo "   4. Setup monitoring e logging"
