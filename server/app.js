const express = require('express');
const https = require('https');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require("body-parser");
require('dotenv').config();

// Middleware and routes
const ApiKey = require("./middleware/apiKeyMiddleware");
const mangaRouter = require("./routes/mangaRouter");
const mangaListRouter = require("./routes/mangaListRouter");
const mangaSearch = require("./routes/mangaSearch");
const dataCollector = require('./middleware/mangaList/dataCollectorMiddleware');
const pagesValidation = require('./middleware/mangaList/pageValidationMiddleware');
const ListManga = require('./controllers/ListMangaController');

const app = express();

app.use(cors({
    origin: 'https://mangareader-1.onrender.com', // Remove trailing slash
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// 🔐 Protect routes with API Key
app.use(ApiKey);

// 📚 Main routes
app.use("/api/manga", mangaRouter);
app.use("/api/search", mangaSearch);
app.get('/api/mangaList', dataCollector, pagesValidation, ListManga);

// 🖼 Image proxy using Cloudflare Worker
app.get('/api/imageProxy', (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.startsWith("http")) {
        return res.status(400).send("Invalid 'url' parameter.");
    }

    const proxyUrl = `https://green-cloud-fef8.stilhofsvej46.workers.dev/?url=${encodeURIComponent(imageUrl)}`;
    res.redirect(proxyUrl);
});

// 🚀 Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
