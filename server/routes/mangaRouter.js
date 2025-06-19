// routes/mangaRouter.js
const express = require('express');
const { LRUCache } = require('lru-cache'); // ✅ correct import
const { performance } = require('perf_hooks');

module.exports = (browser) => {
    const router = express.Router();
    const mangaDetailCache = new LRUCache({ max: 300, ttl: 1000 * 60 * 10 });

    async function scrapeManga(id) {
        const url = `https://www.mangakakalot.gg/manga/${id}`;
        const t0 = performance.now();
        let page;

        try {
            page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

            const title = await page.$eval('h1', el => el.textContent.trim());
            const coverImage = await page.$eval('img.lazy', img => img.src);
            const description = await page.$eval('#contentBox', el => el.innerText.trim());
            const authors = await page.$$eval('li', lis => {
                const li = lis.find(x => x.textContent.includes('Author(s) :'));
                return li ? [...li.querySelectorAll('a')].map(a => a.textContent.trim()) : [];
            });
            const status = await page.$$eval('li', lis => {
                const li = lis.find(x => x.textContent.includes('Status :'));
                return li ? li.textContent.replace('Status :', '').trim() : '';
            });
            const genres = await page.$$eval('.genres a', els => els.map(x => x.textContent.trim()));
            const chapters = await page.$$eval('.chapter-list .row', rows =>
                rows.slice(0, 50).map(r => {
                    const a = r.querySelector('a'), d = r.querySelector('span[title]');
                    return a && d ? { title: a.textContent.trim(), url: a.href, date: d.getAttribute('title').trim() } : null;
                }).filter(Boolean)
            );

            await page.close();
            const t1 = performance.now();
            console.log(`⏱ scrapeManga(${id}) in ${(t1 - t0).toFixed(0)}ms`);

            return { id, title, coverImage, description, authors, status, genres, chapters };
        } catch (err) {
            if (page) await page.close();
            throw err;
        }
    }

    router.get('/:id', async (req, res) => {
        const mangaId = req.params.id;
        const cached = mangaDetailCache.get(mangaId);
        if (cached) return res.json(cached);

        try {
            const data = await scrapeManga(mangaId);
            mangaDetailCache.set(mangaId, data);
            res.json(data);
        } catch (err) {
            console.error('Error in scrapeManga:', err.message);
            res.status(500).json({ error: 'Failed to fetch manga data' });
        }
    });

    return router;
};
