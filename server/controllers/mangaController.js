const cheerio = require("cheerio");

const mangaController = (req, res) => {
    const $ = cheerio.load(req.html);
    const target = $(".manga-info-top");

    if (target.length === 0) {
        console.error("❌ .manga-info-top not found");
        return res.status(500).json({ state: 500, message: "Manga details not found on page" });
    }

    try {
        const metaData = {
            imageUrl: "https://www.mangakakalot.gg/" + target.find(".manga-info-pic img").attr("src"),
            name: target.find(".manga-info-text li:eq(0) h1").text(),
            author: target.find(".manga-info-text li:eq(1) a").text(),
            status: target.find(".manga-info-text li:eq(2)").text().split(":")[1]?.trim() || "Unknown",
            updated: target.find(".manga-info-text li:eq(3)").text().split(":")[1]?.trim() || "Unknown",
            view: target.find(".manga-info-text li:eq(5)").text().split(":")[1]?.trim() || "Unknown",
            genres: target.find(".manga-info-text li:eq(6)").text().split(":")[1]?.trim()?.split(",").map(val => val.trim()).filter(Boolean) || [],
        };

        res.json({
            ...metaData,
            chapterList: req.chapterList,
        });
    } catch (err) {
        console.error("❌ Parsing error in mangaController:", err);
        return res.status(500).json({ state: 500, message: "Failed to parse manga details" });
    }
};

module.exports = mangaController;
