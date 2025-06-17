const express = require('express');
const mangaExist = require("../middleware/manga/mangaExistMiddleware");
const chapterExist = require("../middleware/manga/chapterExistMiddleware");
const mangaController = require("../controllers/mangaController");
const chapterController = require("../controllers/chapterController");
const httpReq = require('request-promise');
const cheerio = require('cheerio');

const manga = express.Router();

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

// GET manga details
manga.get("/:id", mangaExist, async (req, res) => {
    const title = req.params.id;
    console.log("➡️ Received request for manga:", title);

    try {
        const url = `https://www.mangakakalot.gg/manga/${title}`;
        console.log("🔗 Fetching from:", url);
        const html = await httpReq(url);
        console.log("📥 HTML fetch successful: length =", html.length);

        const chapterList = await scrapeChapterList(title);
        console.log("🧾 Scraped chapter count:", chapterList.length);

        req.html = html;
        req.chapterList = chapterList;

        mangaController(req, res);
        console.log("✅ mangaController executed without errors");
    } catch (err) {
        console.error("💥 Error in manga route:", err);
        res.status(500).json({ state: 500, message: err.message });
    }
});


// GET chapter details
manga.get("/:id/:ch", chapterExist, async (req, res) => {
    const { id, ch } = req.params;
    console.log("📘 Chapter route for:", id, ch);
    try {
        const html = await httpReq(`https://www.mangakakalot.gg/manga/${id}/chapter_${ch}`);
        req.html = html;
        chapterController(req, res);
    } catch (err) {
        console.error("❌ Chapter route error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = manga;
