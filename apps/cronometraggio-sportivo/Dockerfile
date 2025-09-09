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
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Avvia l'applicazione
CMD ["npm", "start"]
