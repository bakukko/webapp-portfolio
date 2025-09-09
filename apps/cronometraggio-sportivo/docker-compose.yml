# Dockerfile
FROM node:18-alpine

# Imposta la directory di lavoro
WORKDIR /app

# Installa dipendenze per compilazione native
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copia package files
COPY package*.json ./

# Installa dipendenze
RUN npm ci --only=production && npm cache clean --force

# Copia il codice dell'applicazione
COPY . .

# Crea directory per uploads
RUN mkdir -p uploads && chmod 755 uploads

# Crea utente non-root per sicurezza
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Cambia ownership dei file
RUN chown -R nextjs:nodejs /app
USER nextjs

# Espone la porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Avvia l'applicazione
CMD ["npm", "start"]

---

# docker-compose.yml
version: '3.8'

services:
  # Database PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: cronometraggio-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: cronometraggio_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-database.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - cronometraggio-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Applicazione Node.js
  app:
    build: .
    container_name: cronometraggio-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: cronometraggio_db
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD:-secure_password}
      SESSION_SECRET: ${SESSION_SECRET:-change_in_production}
      PORT: 3000
    ports:
      - "3000:3000"
    volumes:
      - uploads_data:/app/uploads
    networks:
      - cronometraggio-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx Reverse Proxy (opzionale per produzione)
  nginx:
    image: nginx:alpine
    container_name: cronometraggio-nginx
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    networks:
      - cronometraggio-network

  # Redis per sessioni (opzionale)
  redis:
    image: redis:7-alpine
    container_name: cronometraggio-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - cronometraggio-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
    driver: local
  uploads_data:
    driver: local
  nginx_logs:
    driver: local
  redis_data:
    driver: local

networks:
  cronometraggio-network:
    driver: bridge

---

# .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.coverage
.DS_Store
uploads/*
!uploads/.gitkeep

---

# healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();

---

# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=uploads:10m rate=1r/s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml;

    server {
        listen 80;
        server_name localhost;

        # Redirect HTTP to HTTPS in production
        # return 301 https://$server_name$request_uri;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";

        # Static files with long cache
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Upload routes with stricter rate limiting
        location /api/upload-csv/ {
            limit_req zone=uploads burst=5 nodelay;
            client_max_body_size 5M;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Main app
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support (for future use)
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }

    # HTTPS Server (production)
    # server {
    #     listen 443 ssl http2;
    #     server_name your-domain.com;
    #     
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    #     ssl_prefer_server_ciphers off;
    #     
    #     # Same location blocks as above...
    # }
}

---

# scripts/deploy.sh
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
mkdir -p uploads nginx/ssl

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
curl -f http://localhost:3000/api/health || echo "⚠️  Health check fallito"

echo "✅ Deploy completato!"
echo "📱 App disponibile su: http://localhost:3000"
echo "📊 Database: localhost:5432"

---

# scripts/backup.sh
#!/bin/bash

# Script di backup per database e uploads
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="cronometraggio_db_${DATE}.sql"
UPLOADS_BACKUP_FILE="uploads_${DATE}.tar.gz"

echo "💾 Avvio backup..."

# Crea directory backup
mkdir -p $BACKUP_DIR

# Backup database
echo "🗃️  Backup database..."
docker-compose exec -T postgres pg_dump -U postgres cronometraggio_db > "$BACKUP_DIR/$DB_BACKUP_FILE"

# Backup uploads
echo "📁 Backup uploads..."
tar -czf "$BACKUP_DIR/$UPLOADS_BACKUP_FILE" uploads/

# Rimuovi backup vecchi (mantieni ultimi 7 giorni)
echo "🧹 Pulizia backup vecchi..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completato in $BACKUP_DIR"
ls -la $BACKUP_DIR

---

# scripts/restore.sh
#!/bin/bash

# Script di restore da backup
set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql>"
    echo "Available backups:"
    ls -la backups/*.sql 2>/dev/null || echo "Nessun backup trovato"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ File backup non trovato: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ATTENZIONE: Questo sovrascriverà il database corrente!"
read -p "Continuare? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operazione annullata"
    exit 1
fi

echo "🔄 Restore in corso..."

# Stop app per sicurezza
docker-compose stop app

# Drop e ricrea database
docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS cronometraggio_db;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE cronometraggio_db;"

# Restore dal backup
cat $BACKUP_FILE | docker-compose exec -T postgres psql -U postgres cronometraggio_db

# Restart app
docker-compose start app

echo "✅ Restore completato da $BACKUP_FILE"

---

# scripts/update.sh
#!/bin/bash

# Script di update dell'applicazione
set -e

echo "🔄 Aggiornamento applicazione..."

# Pull latest changes
git pull origin main

# Rebuild containers
echo "🔨 Rebuild containers..."
docker-compose build --no-cache

# Update con zero downtime
echo "🚀 Aggiornamento con zero downtime..."
docker-compose up -d --force-recreate --renew-anon-volumes

# Health check
echo "🏥 Controllo salute applicazione..."
sleep 10
curl -f http://localhost:3000/api/health

echo "✅ Aggiornamento completato!"

---

# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: test_db
        DB_USER: postgres
        DB_PASSWORD: test_password
        NODE_ENV: test
    
    - name: Build application
      run: npm run build
    
    - name: Run security audit
      run: npm audit --audit-level moderate

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t cronometraggio-sportivo .
    
    - name: Run container tests
      run: |
        docker run -d --name test-container -p 3000:3000 cronometraggio-sportivo
        sleep 30
        curl -f http://localhost:3000/api/health
        docker stop test-container

  deploy:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        echo "🚀 Deployment to production would happen here"
        # Add your deployment logic here
        # e.g., SSH to server, pull changes, restart services

---

# package.json scripts aggiuntivi
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "init-db": "node scripts/init-database.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "build": "echo 'Build step - add your build logic here'",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "backup": "./scripts/backup.sh",
    "deploy": "./scripts/deploy.sh",
    "update": "./scripts/update.sh"
  }
}
