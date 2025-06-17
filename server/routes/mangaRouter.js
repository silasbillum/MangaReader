const mangaExist = require("../middleware/manga/mangaExistMiddleware")
const mangaController = require("../controllers/mangaController")
const chapterList = require("../middleware/manga/chapterList")
const chapterController = require("../controllers/chapterController")
const chapterExist = require("../middleware/manga/chapterExistMiddleware")

const express = require('express');
const router = express.Router();
const httpReq = require('request-promise');
const cheerio = require('cheerio');
const mangaController = require('../controllers/mangaController');

const manga = require("express").Router()

manga.get("/:id",
    mangaExist,
    chapterList,
    mangaController
)

manga.get("/:id/:ch",
    chapterExist,
    chapterController
)

const scrapeChapterList = async (title) => {
    const url = `https://www.mangakakalot.gg/manga/${title}`;
    const html = await httpReq(url);
    const $ = cheerio.load(html);

    return $(".chapter-list a").map((i, el) => ({
        id: $(el).attr('href').split('/').pop(),
        name: $(el).text().trim(),
        path: $(el).attr('href'),
    })).get();
};


router.get('/api/manga/:title', async (req, res) => {
    const title = req.params.title;

    try {
        // Scrape chapter list first
        const chapterList = await scrapeChapterList(title);

        // Fetch manga page HTML
        const url = `https://www.mangakakalot.gg/manga/${title}`;
        const html = await httpReq(url);

        // Attach data to req for mangaController
        req.html = html;
        req.chapterList = chapterList;

        // Call mangaController to parse and send JSON response
        mangaController(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch manga details' });
    }
});

module.exports = manga