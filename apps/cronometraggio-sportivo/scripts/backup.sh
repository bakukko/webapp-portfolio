#!/bin/bash

# Script di backup per database e uploads
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="cronometraggio_db_${DATE}.sql"
UPLOADS_BACKUP_FILE="uploads_${DATE}.tar.gz"
LOGS_BACKUP_FILE="logs_${DATE}.tar.gz"

echo "💾 Avvio backup..."

# Crea directory backup se non esiste
mkdir -p $BACKUP_DIR

# Verifica che i servizi siano attivi
if ! docker-compose ps | grep -q "Up"; then
    echo "⚠️  Servizi Docker non attivi. Avvio servizi..."
    docker-compose up -d
    sleep 10
fi

# Backup database
echo "🗃️  Backup database PostgreSQL..."
if docker-compose exec -T postgres pg_dump -U postgres cronometraggio_db > "$BACKUP_DIR/$DB_BACKUP_FILE"; then
    echo "✅ Database backup salvato: $DB_BACKUP_FILE"
else
    echo "❌ Errore nel backup database"
    exit 1
fi

# Backup uploads
if [ -d "uploads" ] && [ "$(ls -A uploads)" ]; then
    echo "📁 Backup cartella uploads..."
    tar -czf "$BACKUP_DIR/$UPLOADS_BACKUP_FILE" uploads/
    echo "✅ Uploads backup salvato: $UPLOADS_BACKUP_FILE"
else
    echo "ℹ️  Cartella uploads vuota, backup saltato"
fi

# Backup logs se esistono
if [ -d "logs" ] && [ "$(ls -A logs)" ]; then
    echo "📜 Backup logs..."
    tar -czf "$BACKUP_DIR/$LOGS_BACKUP_FILE" logs/
    echo "✅ Logs backup salvato: $LOGS_BACKUP_FILE"
else
    echo "ℹ️  Nessun log da backup"
fi

# Backup configurazione
echo "⚙️  Backup configurazione..."
cp .env "$BACKUP_DIR/.env_${DATE}" 2>/dev/null || echo "ℹ️  File .env non trovato"
cp docker-compose.yml "$BACKUP_DIR/docker-compose_${DATE}.yml"

# Rimuovi backup vecchi (mantieni ultimi 7 giorni)
echo "🧹 Pulizia backup vecchi (>7 giorni)..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name ".env_*" -mtime +7 -delete
find $BACKUP_DIR -name "docker-compose_*" -mtime +7 -delete

# Statistiche backup
echo ""
echo "📊 Backup completato!"
echo "📁 Directory: $BACKUP_DIR"
echo "📈 Spazio utilizzato:"
du -sh $BACKUP_DIR
echo ""
echo "📋 File disponibili:"
ls -la $BACKUP_DIR | tail -10

# Comprimi e ottimizza se ci sono molti file
BACKUP_COUNT=$(ls -1 $BACKUP_DIR/*.sql 2>/dev/null | wc -l)
if [ $BACKUP_COUNT -gt 20 ]; then
    echo "⚠️  Molti backup presenti ($BACKUP_COUNT). Considera di archiviarli."
fi

echo "✅ Backup processo completato alle $(date)"
