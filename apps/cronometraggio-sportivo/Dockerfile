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
      PORT: 3002
    ports:
      - "3002:3002"
    volumes:
      - uploads_data:/app/uploads
    networks:
      - cronometraggio-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

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
  redis_data:
    driver: local

networks:
  cronometraggio-network:
    driver: bridge
