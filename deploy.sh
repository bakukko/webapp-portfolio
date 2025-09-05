#!/bin/sh
echo "Starting deployment..."

# Installa dipendenze
npm run install-all

# Avvia dashboard sulla porta 3000
cd /app/dashboard && npm start &

# Avvia app1 sulla porta 3001
cd /app/apps/app1 && PORT=3001 npm start &

# Avvia bot telegram se esiste
if [ -d "/app/apps/bot-telegram" ]; then
    cd /app/apps/bot-telegram && npm start &
fi

# Mantieni il processo attivo
wait
