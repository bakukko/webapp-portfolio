#!/bin/bash

# Script di restore da backup
set -e

BACKUP_DIR="./backups"

# Funzione per mostrare l'uso
show_usage() {
    echo "📖 Uso: $0 <backup_file.sql> [uploads_backup.tar.gz]"
    echo ""
    echo "Esempi:"
    echo "  $0 cronometraggio_db_20241215_143022.sql"
    echo "  $0 cronometraggio_db_20241215_143022.sql uploads_20241215_143022.tar.gz"
    echo ""
    echo "📁 Backup disponibili:"
    if [ -d "$BACKUP_DIR" ]; then
        echo "Database:"
        ls -la $BACKUP_DIR/*.sql 2>/dev/null | tail -5 || echo "  Nessun backup database trovato"
        echo ""
        echo "Uploads:"
        ls -la $BACKUP_DIR/uploads_*.tar.gz 2>/dev/null | tail -5 || echo "  Nessun backup uploads trovato"
    else
        echo "  Directory backup non trovata: $BACKUP_DIR"
    fi
}

# Controlla parametri
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

DB_BACKUP_FILE=$1
UPLOADS_BACKUP_FILE=$2

# Verifica che il file di backup esista
if [ ! -f "$DB_BACKUP_FILE" ]; then
    echo "❌ File backup database non trovato: $DB_BACKUP_FILE"
    echo ""
    show_usage
    exit 1
fi

# Verifica file uploads se specificato
if [ -n "$UPLOADS_BACKUP_FILE" ] && [ ! -f "$UPLOADS_BACKUP_FILE" ]; then
    echo "❌ File backup uploads non trovato: $UPLOADS_BACKUP_FILE"
    exit 1
fi

echo "🔄 RESTORE CRONOMETRAGGIO SPORTIVO"
echo "=================================="
echo "📁 Database: $DB_BACKUP_FILE"
if [ -n "$UPLOADS_BACKUP_FILE" ]; then
    echo "📁 Uploads: $UPLOADS_BACKUP_FILE"
fi
echo ""

echo "⚠️  ATTENZIONE: Questo sovrascriverà TUTTI i dati correnti!"
echo "   - Database cronometraggio"
echo "   - File uploads (se specificato)"
echo ""
read -p "❓ Continuare con il restore? (yes/NO): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Operazione annullata"
    exit 0
fi

echo ""
echo "🚀 Avvio restore..."

# Verifica che Docker sia attivo
if ! docker-compose ps | grep -q "postgres.*Up"; then
    echo "🐳 Avvio servizi Docker..."
    docker-compose up -d postgres
    sleep 15
fi

# Stop app per sicurezza durante il restore
echo "⏸️  Stop applicazione..."
docker-compose stop app

# Backup di sicurezza prima del restore
echo "💾 Backup di sicurezza prima del restore..."
SAFETY_BACKUP="safety_backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose exec -T postgres pg_dump -U postgres cronometraggio_db > "$BACKUP_DIR/$SAFETY_BACKUP" || echo "⚠️  Backup di sicurezza fallito"

# Restore database
echo "🗃️  Restore database..."
echo "   1. Drop database esistente..."
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS cronometraggio_db;" || true

echo "   2. Creazione nuovo database..."
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE cronometraggio_db;"

echo "   3. Restore dati..."
if cat $DB_BACKUP_FILE | docker-compose exec -T postgres psql -U postgres cronometraggio_db; then
    echo "✅ Database restore completato"
else
    echo "❌ Errore nel restore database"
    echo "🔄 Ripristino backup di sicurezza..."
    docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS cronometraggio_db;"
    docker-compose exec postgres psql -U postgres -c "CREATE DATABASE cronometraggio_db;"
    cat "$BACKUP_DIR/$SAFETY_BACKUP" | docker-compose exec -T postgres psql -U postgres cronometraggio_db
    exit 1
fi

# Restore uploads se specificato
if [ -n "$UPLOADS_BACKUP_FILE" ]; then
    echo "📁 Restore uploads..."
    
    # Backup uploads correnti
    if [ -d "uploads" ] && [ "$(ls -A uploads)" ]; then
        echo "   Backup uploads correnti..."
        mv uploads "uploads_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Estrai backup uploads
    echo "   Estrazione backup uploads..."
    tar -xzf $UPLOADS_BACKUP_FILE
    echo "✅ Uploads restore completato"
fi

# Restart applicazione
echo "🚀 Restart applicazione..."
docker-compose start app
sleep 10

# Test finale
echo "🏥 Test funzionalità..."
if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ Applicazione funzionante"
else
    echo "⚠️  Applicazione potrebbe avere problemi"
fi

# Statistiche finali
echo ""
echo "📊 RESTORE COMPLETATO"
echo "===================="
echo "⏰ Data: $(date)"
echo "📁 Database restore da: $DB_BACKUP_FILE"
if [ -n "$UPLOADS_BACKUP_FILE" ]; then
    echo "📁 Uploads restore da: $UPLOADS_BACKUP_FILE"
fi
echo "💾 Backup sicurezza salvato in: $BACKUP_DIR/$SAFETY_BACKUP"
echo ""
echo "🌐 Applicazione disponibile su: http://localhost:3002"

# Controlla cronometraggi ripristinati
echo ""
echo "📋 Cronometraggi ripristinati:"
docker-compose exec postgres psql -U postgres cronometraggio_db -c "SELECT id, nome, data_creazione FROM cronometraggi ORDER BY data_creazione DESC LIMIT 5;" 2>/dev/null || echo "⚠️  Impossibile verificare i dati"
