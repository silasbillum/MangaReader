const express = require('express');
const axios = require('axios');
const https = require('https');
const ApiKey = require("./middleware/apiKeyMiddleware");
const bodyParser = require("body-parser");
const cors = require('cors');

const mangaRouter = require("./routes/mangaRouter");
const mangaSearch = require("./routes/mangaSearch");

const dataCollector = require('./middleware/mangaList/dataCollectorMiddleware');
const pagesValidation = require('./middleware/mangaList/pageValidationMiddleware');
const ListManga = require('./controllers/ListMangaController');

const app = express();

// Middleware & config
app.use(cors({
    origin: 'https://mangareader-3.onrender.com',  // Change to your actual Blazor app URL
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(ApiKey);

// API routes
app.get('/api/mangaList', dataCollector, pagesValidation, ListManga);
app.use("/api/manga", mangaRouter);
app.use("/api/search", mangaSearch);

// Image proxy endpoint using axios to fetch images with headers to bypass blocking
app.get('/api/imageProxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).send("Invalid or missing 'url' parameter");
    }

    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36',
                'Referer': 'https://www.mangakakalot.gg',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            validateStatus: status => status >= 200 && status < 400,  // accept redirects manually if needed
        });

        // Forward the content-type header from the source
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.send(response.data);
    } catch (error) {
        console.error("🔁 Axios image fetch failed:", error.message);
        res.status(500).send("Image proxy error");
    }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server started on port ${port} 🎉✨`);
});
