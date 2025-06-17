const httpReq = require("request-promise");
const cheerio = require("cheerio");
const urlLink = "https://www.mangakakalot.gg";

const ListManga = async (req, res) => {
    try {
        const type = req.query.type || "hot-manga";
        const page = req.query.page || 1;

        const queryUrl = `${urlLink}/manga-list/${type}?page=${page}`;
        console.log("👉 Final URL:", queryUrl);

        const html = await httpReq({
            uri: queryUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/html',
                'Referer': urlLink
            }
        });

        console.log("✅ HTML received");
        if (!html.includes("list-truyen-item-wrap")) {
            throw new Error("Page does not contain expected manga content. May be blocked or structure changed.");
        }

        const $ = cheerio.load(html);
        const mangaList = [];

        $(".list-truyen-item-wrap").each((i, el) => {
            const target = $(el);

            const imageSrc = target.find("a:first img").attr("data-src");
            const thumb = imageSrc.startsWith("http") ? imageSrc : urlLink + imageSrc;
            const title = target.find("h3 a").text().trim();
            const chapter = target.find(".list-story-item-wrap-chapter").text().trim();
            const view = target.find(".aye_icon").text().trim();
            const description = target.find("p").text().replace("More.\n", " ... \n").trim();

            mangaList.push({
                title,
                thumb,
                chapter,
                view,
                description
            });
        });

        res.json({ mangaList });
    } catch (e) {
        console.error("❌ ListManga Error:", e.message || e);
        res.status(500).json({ error: e.message || e });
    }
};

module.exports = ListManga;
