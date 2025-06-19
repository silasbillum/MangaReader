const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const cors = require('cors');
const LRUCache = require('lru-cache');

require('dotenv').config();

const ApiKey = require("./middleware/apiKeyMiddleware");
const mangaSearch = require("./routes/mangaSearch");
const dataCollector = require('./middleware/mangaList/dataCollectorMiddleware');
const pagesValidation = require('./middleware/mangaList/pageValidationMiddleware');
const ListManga = require('./controllers/ListMangaController');

const app = express();

const imageCache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 10, // 10 minutes
});

const mangaListCache = new LRUCache({
    max: 300,
    ttl: 1000 * 60 * 5, // 5 minutes
});

(async () => {
    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
        headless: 'true',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
        ],
    });

    // Import mangaRouter AFTER browser is ready
    const mangaRouter = require('./routes/mangaRouter')(browser);

    // Middleware - CORS first
    app.use(cors({
        origin: 'https://localhost:3000',
        methods: ['GET'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parser
    app.use(bodyParser.json());

    // API Key Middleware
    app.use(ApiKey);

    // Debug logger for manga API routes
    app.use('/api/manga', (req, res, next) => {
        console.log('🔔 Incoming /api/manga request:', req.method, req.originalUrl);
        next();
    });

    // Routes
    app.use('/api/manga', mangaRouter);
    app.use('/api/search', mangaSearch);

    app.get('/api/mangaList', dataCollector, pagesValidation, ListManga);
    app.get('/api/mangaList/raw', async (req, res, next) => {
        const key = `${req.query.type || 'hot'}_${req.query.page || 1}`;
        const cached = mangaListCache.get(key);
        if (cached) return res.json(cached);

        try {
            const data = await ListManga(req, res, true);
            mangaListCache.set(key, data);
            res.json(data);
        } catch (err) {
            next(err);
        }
    });

    // Image proxy route using Puppeteer
    app.get('/api/imageProxy', async (req, res) => {
        const imageUrl = req.query.url;
        if (!imageUrl || !imageUrl.startsWith('http')) {
            return res.status(400).send("Invalid or missing 'url' parameter.");
        }

        const cached = imageCache.get(imageUrl);
        if (cached) {
            res.set('Content-Type', cached.contentType);
            return res.send(cached.buffer);
        }

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
            await page.setExtraHTTPHeaders({ 'Referer': 'https://www.mangakakalot.gg' });

            await page.goto(imageUrl, { waitUntil: 'networkidle2' });

            // Fetch image buffer inside the page context
            const imageBuffer = await page.evaluate(async () => {
                const response = await fetch(window.location.href);
                const buffer = await response.arrayBuffer();
                return Array.from(new Uint8Array(buffer));
            });

            await page.close();

            const ext = imageUrl.split('.').pop().toLowerCase();
            const contentTypeMap = {
                webp: 'image/webp',
                png: 'image/png',
                gif: 'image/gif',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
            };
            const contentType = contentTypeMap[ext] || 'image/jpeg';

            const buffer = Buffer.from(imageBuffer);

            imageCache.set(imageUrl, { buffer, contentType });

            res.set('Content-Type', contentType);
            res.send(buffer);
        } catch (err) {
            console.error("Puppeteer proxy error:", err);
            res.status(500).send("Image proxy error.");
        }
    });

    // Start the server AFTER everything is set
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });

    // Handle unhandled rejections and exceptions globally
    process.on('unhandledRejection', error => {
        console.error('Unhandled Promise Rejection:', error);
    });

    process.on('uncaughtException', error => {
        console.error('Uncaught Exception:', error);
    });
})();
