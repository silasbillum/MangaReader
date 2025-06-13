const urlLink = "https://www.mangakakalot.gg";
const httpReq = require("request-promise");
const cheerio = require("cheerio");

const pagesValidation = (req, res, next) => {
    req.query.page = Number(req.query.page) || 1;
    const type = (req.query.type || "latest").replace("Top read", "topview").toLowerCase();
    const state = req.query.state || "all";

    const categoryParam = (req.query.category || '').toLowerCase();
    const matchedCategory = req.metaData.category.find(
        (val) => val.name.toLowerCase() === categoryParam
    );

    const categoryId = matchedCategory ? matchedCategory.id : '0'; // '0' usually means 'all' on mangakakalot



    const queryUrl = `${urlLink}/manga-list/${type}?page=${req.query.page}`;

    console.log("Final query URL:", queryUrl);

    httpReq(queryUrl)
        .then((html) => {
            const $ = cheerio.load(html);

            const totalStoriesMatch = $(".panel_page_number .group_qty .page_blue")
                .text()
                .match(/Total:\s*([\d,]+)\s+stories/);

            const totalPagesMatch = $(".panel_page_number .group_page .page_last")
                .text()
                .match(/Last\((\d+)\)/);

            const totalStories = totalStoriesMatch ? Number(totalStoriesMatch[1].replace(/,/g, "")) : 0;
            const totalPages = totalPagesMatch ? Number(totalPagesMatch[1]) : 1;

            req.metaData = {
                ...req.metaData,
                totalStories,
                totalPages
            };

            // Clamp page
            req.query.page = Math.max(1, Math.min(req.query.page, totalPages));

            next();
        })
        .catch((e) => {
            res.status(500).json({ error: e.message || e });
        });
};


module.exports = pagesValidation;
