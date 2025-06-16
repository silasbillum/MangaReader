const express = require('express');
const puppeteer = require('puppeteer');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const axios = require('axios');
const https = require('https');
const ApiKey = require("./middleware/apiKeyMiddleware");
const app = express();
const bodyParser = require("body-parser");
const mangaRouter = require("./routes/mangaRouter");
const mangaListRouter = require("./routes/mangaListRouter");
const mangaSearch = require("./routes/mangaSearch");

const dataCollector = require('./middleware/mangaList/dataCollectorMiddleware');
const pagesValidation = require('./middleware/mangaList/pageValidationMiddleware');
const ListManga = require('./controllers/ListMangaController');

app.get('/api/mangaList', dataCollector, pagesValidation, ListManga);


const browser = await puppeteer.launch({
    headless: true,
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
    ]
});

const maxRedirects = 5; // Prevent infinite redirect loops

async function fetchWithRedirects(url, redirectCount = 0) {
    if (redirectCount > maxRedirects) {
        throw new Error("Too many redirects");
    }

    const response = await axios.get(url, {
        responseType: 'stream',
        maxRedirects: 0, // We handle redirects manually
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Referer': 'https://www.mangakakalot.gg',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            // 'Cookie': 'your_cookie_if_needed_here'
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        validateStatus: status => (status >= 200 && status < 400)
    });

    // Handle 3xx redirects manually
    if (response.status >= 300 && response.status < 400) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
            throw new Error("Redirect location header missing");
        }
        // Support relative redirects
        const newUrl = new URL(redirectUrl, url).href;
        return fetchWithRedirects(newUrl, redirectCount + 1);
    }

    return response;
}

app.get('/api/imageProxy', async (req, res) => {
    const { url: imageUrl } = req.query;
    if (!imageUrl?.startsWith('http')) {
        return res.status(400).send("Invalid 'url'");
    }

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36',
                'Referer': 'https://www.mangakakalot.gg',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (err) {
        console.error("🔁 Axios image fetch failed:", err.message);
        res.status(500).send("Image proxy error");
    }
});
const cors = require('cors');

app.use(cors({
    origin: 'https://mangareader-2./', // Change to your Blazor app URL & port
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
require('dotenv').config();

app.use(ApiKey);
app.use("/api/manga", mangaRouter);
app.use("/api/search", mangaSearch);

app.listen(process.env.PORT, () => {
    console.log(`Server Start On Port ${process.env.PORT} 🎉✨ `);
});
