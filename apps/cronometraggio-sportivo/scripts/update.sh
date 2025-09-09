#!/bin/bash

# Script di update dell'applicazione
set -e

echo "🔄 AGGIORNAMENTO CRONOMETRAGGIO SPORTIVO"
echo "========================================"

# Controlla se siamo in una directory git
if [ ! -d ".git" ]; then
    echo "❌ Non siamo in un repository Git"
    echo "💡 Per aggiornamenti manuali:"
    echo "   1. Scarica l'ultima versione"
    echo "   2. Sostituisci i file"
    echo "   3. Esegui: docker-compose build --no-cache"
    exit 1
fi

# Verifica connessione Git
echo "🔍 Verifica aggiornamenti disponibili..."
git fetch origin main

# Controlla se ci sono aggiornamenti
BEHIND=$(git rev-list HEAD..origin/main --count)
if [ $BEHIND -eq 0 ]; then
    echo "✅ Applicazione già aggiornata!"
    echo "📊 Versione corrente: $(git rev-parse --short HEAD)"
    exit 0
fi

echo "🆕 Trovati $BEHIND nuovi aggiornamenti"
echo "📋 Modifiche in arrivo:"
git log --oneline HEAD..origin/main

echo ""
read -p "❓ Procedere con l'aggiornamento? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aggiornamento annullato"
    exit 0
fi

# Backup prima dell'aggiornamento
echo ""
echo "💾 Backup automatico pre-aggiornamento..."
if [ -f "scripts/backup.sh" ]; then
    ./scripts/backup.sh
else
    echo "⚠️  Script backup non trovato, backup manuale..."
    mkdir -p backups
    docker-compose exec -T postgres pg_dump -U postgres cronometraggio_db > "backups/pre_update_$(date +%Y%m%d_%H%M%S).sql"
fi

# Salva eventuali modifiche locali
echo "💾 Salvataggio modifiche locali..."
git stash push -m "Pre-update stash $(date)"

# Pull delle modifiche
echo "⬇️  Download aggiornamenti..."
if git pull origin main; then
    echo "✅ Codice aggiornato"
else
    echo "❌ Errore nel download"
    echo "🔄 Ripristino modifiche locali..."
    git stash pop
    exit 1
fi

# Verifica se ci sono modifiche ai file Docker
DOCKER_CHANGED=false
if git diff HEAD~$BEHIND HEAD --name-only | grep -E "(Dockerfile|docker-compose|package\.json)" > /dev/null; then
    DOCKER_CHANGED=true
    echo "🔨 Rilevate modifiche ai container, rebuild necessario..."
fi

# Rebuild containers se necessario
if [ "$DOCKER_CHANGED" = true ]; then
    echo "🔨 Rebuild containers..."
    docker-compose build --no-cache
else
    echo "📦 Riavvio containers esistenti..."
fi

# Aggiornamento con zero downtime
echo "🚀 Aggiornamento applicazione..."

# Se ci sono modifiche al database
if git diff HEAD~$BEHIND HEAD --name-only | grep -E "(init-database|migrations)" > /dev/null; then
    echo "🗃️  Aggiornamento database rilevato..."
    docker-compose exec app npm run init-db
fi

# Restart servizi
echo "🔄 Restart servizi..."
docker-compose up -d --force-recreate --renew-anon-volumes

# Attendi che i servizi siano pronti
echo "⏳ Attesa riavvio servizi..."
sleep 15

# Health check
echo "🏥 Controllo salute applicazione..."
RETRY=0
MAX_RETRIES=6
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
        echo "✅ Applicazione funzionante"
        break
    else
        echo "⏳ Tentativo $((RETRY+1))/$MAX_RETRIES..."
        sleep 5
        RETRY=$((RETRY+1))
    fi
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "❌ Applicazione non risponde dopo l'aggiornamento"
    echo "🔄 Rollback in corso..."
    
    # Rollback
    git reset --hard HEAD~$BEHIND
    docker-compose up -d --force-recreate
    
    echo "💡 Rollback completato. Controlla i log per errori:"
    echo "   docker-compose logs -f"
    exit 1
fi

# Pulizia
echo "🧹 Pulizia immagini Docker vecchie..."
docker image prune -f

# Informazioni finali
echo ""
echo "🎉 AGGIORNAMENTO COMPLETATO!"
echo "=========================="
echo "📊 Versione precedente: $(git rev-parse --short HEAD~$BEHIND)"
echo "📊 Versione attuale: $(git rev-parse --short HEAD)"
echo "🌐 Applicazione: http://localhost:3002"
echo "📋 Stato servizi:"
docker-compose ps

# Log modifiche importanti
echo ""
echo "📝 Principali modifiche applicate:"
git log --oneline HEAD~$BEHIND..HEAD

# Controllo modifiche locali salvate
STASH_COUNT=$(git stash list | wc -l)
if [ $STASH_COUNT -gt 0 ]; then
    echo ""
    echo "💾 Modifiche locali salvate in stash:"
    echo "   Per ripristinarle: git stash pop"
    echo "   Per vederle: git stash show -p"
fi

echo ""
echo "✅ Aggiornamento completato con successo!"
