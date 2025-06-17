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
    const title = req.params.id;
    console.log(`🔍 Fetching manga: ${title}`);

    try {
        const url = `https://www.mangakakalot.gg/manga/${title}`;
        const html = await httpReq(url);
        console.log("✅ Fetched HTML");

        const chapterList = await scrapeChapterList(title);
        console.log(`✅ Chapters scraped: ${chapterList.length}`);

        req.html = html;
        req.chapterList = chapterList;

        mangaController(req, res);
    } catch (err) {
        console.error("🛑 Error in manga router:", err.message);
        res.status(500).json({
            state: 500,
            message: err.message || 'Something goes wrong',
        });
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
