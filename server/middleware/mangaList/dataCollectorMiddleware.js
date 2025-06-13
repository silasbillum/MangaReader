const httpReq = require("request-promise");
const cheerio = require("cheerio");
const url = require("url");

const baseUrl = "https://www.mangakakalot.gg";

const dataCollector = (req, res, next) => {
    httpReq(baseUrl)
        .then((html) => {
            const $ = cheerio.load(html);

            const categories = [];
            $(".truyen-list .tag:eq(0) li a").map((index, val) => {
                const target = $(val)
                const id = url.parse(target.attr("href"), true).query.category
                categories[index] = {
                    id: id,
                    name: target.text()
                };

            })

            const types = [];
            $(".truyen-list .tag:eq(1) li a").each((index, val) => {
                const target = $(val);
                const id = url.parse(target.attr("href"), true).query.type;
                types.push({
                    id,
                    name: target.text().trim(),
                });
            });

            const states = [];
            $(".truyen-list .tag:eq(2) li a").each((index, val) => {
                const target = $(val);
                const id = url.parse(target.attr("href"), true).query.state;
                states.push({
                    id,
                    name: target.text().trim(),
                });
            });

            req.metaData = {
                category: categories,
                type: types,
                state: states,
            };

            next();
        })
        .catch((e) => {
            res.status(500).json({ error: e.message || e });
        });
};

module.exports = dataCollector;
