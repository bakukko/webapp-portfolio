const express = require('express');
const axios = require('axios');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Shlink
const SHLINK_BASE_URL = 'https://endu-l.ink';
const SHLINK_API_KEY = '92d0c9d8-864f-4539-88dd-9c7b37df5f5c';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint per testare la connessione con Shlink
app.get('/api/test-connection', async (req, res) => {
    try {
        const response = await axios({
            method: 'GET',
            url: `${SHLINK_BASE_URL}/rest/v3/short-urls`,
            headers: {
                'X-Api-Key': SHLINK_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({
            success: true,
            message: 'Connessione a Shlink OK',
            data: {
                totalShortUrls: response.data.shortUrls?.pagination?.totalItems || 'N/A'
            }
        });
    } catch (error) {
        console.error('Test connessione fallito:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Connessione fallita',
            details: {
                status: error.response?.status,
                message: error.message,
                data: error.response?.data
            }
        });
    }
});

// Endpoint per creare shortlink
app.post('/api/create-shortlink', async (req, res) => {
    try {
        const { url, slug } = req.body;

        // Validazione input
        if (!url) {
            return res.status(400).json({ error: 'URL è obbligatorio' });
        }

        // Preparazione dati per Shlink API
        const shlinkData = {
            longUrl: url,
            tags: ['temporaneo'],
            findIfExists: true
        };
        
        // Aggiungi slug solo se presente
        if (slug && slug.trim()) {
            shlinkData.customSlug = slug.trim();
        }

        // Configurazione richiesta Shlink API
        const shlinkConfig = {
            method: 'POST',
            url: `${SHLINK_BASE_URL}/rest/v2/short-urls`,
            headers: {
                'X-Api-Key': SHLINK_API_KEY,
                'Content-Type': 'application/json'
            },
            data: shlinkData
        };

        console.log('Chiamata Shlink API:', shlinkConfig);

        // Chiamata all'API Shlink
        const response = await axios(shlinkConfig);
        const shortUrl = response.data.shortUrl;

        console.log('Risposta Shlink:', response.data);

        // Genera QR Code con alta qualità e cornice bianca
        const qrOptions = {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            quality: 0.92,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300 // 300 dpi equivalente
        };

        const qrCodeDataURL = await QRCode.toDataURL(shortUrl, qrOptions);

        res.json({
            success: true,
            shortUrl: shortUrl,
            originalUrl: url,
            slug: slug,
            qrCode: qrCodeDataURL
        });

    } catch (error) {
        console.error('Errore nella creazione shortlink:', error.response?.data || error.message);
        
        // Gestione errori specifici di Shlink
        if (error.response?.status === 400) {
            const errorMessage = error.response.data?.detail || 'Parametri non validi';
            return res.status(400).json({ error: errorMessage });
        } else if (error.response?.status === 401) {
            return res.status(401).json({ error: 'API Key non valida' });
        } else if (error.response?.status === 409) {
            return res.status(409).json({ error: 'Slug già esistente' });
        }
        
        res.status(500).json({ 
            error: 'Errore interno del server',
            details: error.message 
        });
    }
});

// Endpoint per servire il file index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Avvio server
app.listen(PORT, () => {
    console.log(`Server in esecuzione su porta ${PORT}`);
    console.log(`Apri http://localhost:${PORT} nel browser`);
});
