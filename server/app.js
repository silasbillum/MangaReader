const express = require('express');
const puppeteer = require('puppeteer');
const https = require('https');
const axios = require('axios');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');

// Middleware and routes
const ApiKey = require("./middleware/apiKeyMiddleware");
const mangaRouter = require("./routes/mangaRouter");
const mangaListRouter = require("./routes/mangaListRouter");
const mangaSearch = require("./routes/mangaSearch");
const dataCollector = require('./middleware/mangaList/dataCollectorMiddleware');
const pagesValidation = require('./middleware/mangaList/pageValidationMiddleware');
const ListManga = require('./controllers/ListMangaController');
const { LRUCache } = require('lru-cache');

const imageCache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 10, // 10 minutes
});

const mangaListCache = new LRUCache({
    max: 300,
    ttl: 1000 * 60 * 5 // 5 minutes
});


let browser;

// Start Puppeteer at server startup
(async () => {
    browser = await puppeteer.launch({
        headless: 'new',
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
        ]
    });

    const PORT = process.env.PORT || 10000;

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
})();

const maxRedirects = 5;
async function fetchWithRedirects(url, redirectCount = 0) {
    if (redirectCount > maxRedirects) {
        throw new Error("Too many redirects");
    }

    const response = await axios.get(url, {
        responseType: 'stream',
        maxRedirects: 0,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://www.mangakakalot.gg',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        validateStatus: status => (status >= 200 && status < 400)
    });

    if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) throw new Error("Redirect location header missing");
        const newUrl = new URL(redirectUrl, url).href;
        return fetchWithRedirects(newUrl, redirectCount + 1);
    }

    return response;
}

// 🔧 Image proxy route using shared Puppeteer browser
app.get('/api/imageProxy', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).send("Invalid or missing 'url' parameter.");
    }

    // 🚀 Check cache first
    const cached = imageCache.get(imageUrl);
    if (cached) {
        res.set('Content-Type', cached.contentType);
        return res.send(cached.buffer);
    }

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
        await page.setExtraHTTPHeaders({
            'Referer': 'https://www.mangakakalot.gg',
        });

        await page.goto(imageUrl, { waitUntil: 'networkidle2' });

        const imageBuffer = await page.evaluate(async () => {
            const res = await fetch(window.location.href);
            const buf = await res.arrayBuffer();
            return Array.from(new Uint8Array(buf));
        });

        await page.close();

        const ext = imageUrl.split('.').pop().toLowerCase();
        const contentType = {
            webp: 'image/webp',
            png: 'image/png',
            gif: 'image/gif',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
        }[ext] || 'image/jpeg';

        const buffer = Buffer.from(imageBuffer);

        // 💾 Save to cache
        imageCache.set(imageUrl, { buffer, contentType });

        res.set('Content-Type', contentType);
        res.send(buffer);
    } catch (err) {
        console.error("Puppeteer proxy error:", err);
        res.status(500).send("Image proxy error.");
    }
});


// 🔐 CORS (adjust to actual frontend URL)
app.use(cors({
    origin: 'https://localhost:5001',
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(bodyParser.json());

// API key middleware
app.use(ApiKey);

// Routes
app.use("/api/manga", mangaRouter);
app.use("/api/search", mangaSearch);
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



