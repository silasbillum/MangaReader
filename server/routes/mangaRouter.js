const express = require('express');
const mangaExist = require("../middleware/manga/mangaExistMiddleware");
const chapterExist = require("../middleware/manga/chapterExistMiddleware");
const mangaController = require("../controllers/mangaController");
const chapterController = require("../controllers/chapterController");
const httpReq = require('request-promise');
const cheerio = require('cheerio');

const manga = express.Router();

// Utility function to scrape chapters
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

// GET single manga details
manga.get("/:id", mangaExist, async (req, res) => {
    try {
        const title = req.params.id;
        const url = `https://www.mangakakalot.gg/manga/${title}`;
        const html = await httpReq(url);
        const chapterList = await scrapeChapterList(title);

        req.html = html;
        req.chapterList = chapterList;

        mangaController(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch manga details' });
    }
});

// GET specific chapter
manga.get("/:id/:ch", chapterExist, async (req, res) => {
    try {
        const { id, ch } = req.params;
        const url = `https://www.mangakakalot.gg/manga/${id}/chapter_${ch}`;
        const html = await httpReq(url);

        req.html = html;
        chapterController(req, res);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch chapter' });
    }
});

module.exports = manga;
