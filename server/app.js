const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const ApiKey = require("./middleware/apiKeyMiddleware");
const mangaSearch = require("./routes/mangaSearch");
const dataCollector = require('./middleware/mangaList/dataCollectorMiddleware');
const pagesValidation = require('./middleware/mangaList/pageValidationMiddleware');
const ListManga = require('./controllers/ListMangaController');

const app = express();

(async () => {
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

    const mangaRouter = require('./routes/mangaRouter')(browser);

    app.use(cors({
        origin: 'https://localhost:3000',
        methods: ['GET'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    app.use(bodyParser.json());

    app.use(ApiKey);

    app.use('/api/manga', mangaRouter);
    app.use('/api/search', mangaSearch);

    app.get('/api/mangaList', dataCollector, pagesValidation, ListManga);

    const PORT = process.env.PORT || 10000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });

    process.on('unhandledRejection', error => {
        console.error('Unhandled Promise Rejection:', error);
    });

    process.on('uncaughtException', error => {
        console.error('Uncaught Exception:', error);
    });
})();
