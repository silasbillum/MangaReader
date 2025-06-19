const express = require('express');
const puppeteer = require('puppeteer');

const router = express.Router();

const { performance } = require('perf_hooks');
const t0 = performance.now();


async function scrapeManga(id, browser) {
    const url = `https://www.mangakakalot.gg/manga/${id}`;
    let browser;

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resource = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resource)) {
            req.abort();
        } else {
            req.continue();
        }
    });

    console.time('total-scrape');

    try {
        console.time('launch-browser');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        console.timeEnd('launch-browser');

        console.time('open-page');
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        console.timeEnd('open-page');

        console.time('scrape-title');
        const title = await page.$eval('h1', el => el.textContent.trim());
        console.timeEnd('scrape-title');

        console.time('scrape-cover');
        const coverImage = await page.$eval('img.lazy', img => img.src);
        console.timeEnd('scrape-cover');

        console.time('scrape-description');
        const description = await page.$eval('#contentBox', el => {
            let text = el.innerText || el.textContent || '';
            return text.replace(/\n+/g, '\n').trim();
        });
        console.timeEnd('scrape-description');

        console.time('scrape-authors');
        const authors = await page.$$eval('li', lis => {
            const authorLi = lis.find(li => li.textContent.includes('Author(s) :'));
            if (!authorLi) return [];
            return Array.from(authorLi.querySelectorAll('a')).map(a => a.textContent.trim());
        });
        console.timeEnd('scrape-authors');

        console.time('scrape-status');
        const status = await page.$$eval('li', lis => {
            const statusLi = lis.find(li => li.textContent.includes('Status :'));
            return statusLi ? statusLi.textContent.replace('Status :', '').trim() : '';
        });
        console.timeEnd('scrape-status');

        console.time('scrape-genres');
        const genres = await page.$$eval('.genres a', els => els.map(el => el.textContent.trim()));
        console.timeEnd('scrape-genres');

        console.time('scrape-chapters');
        const chapters = await page.$$eval('.chapter-list .row', rows => {
            return rows.slice(0, 50).map(row => {
                const linkEl = row.querySelector('a');
                const dateEl = row.querySelector('span[title]');
                if (!linkEl || !dateEl) return null;
                return {
                    title: linkEl.textContent.trim(),
                    url: linkEl.href,
                    date: dateEl.getAttribute('title').trim(),
                };
            }).filter(Boolean);
        });

        console.timeEnd('scrape-chapters');

        await browser.close();
        console.timeEnd('total-scrape');

        return { id, title, coverImage, description, authors, status, genres, chapters };

    } catch (error) {
        if (browser) await browser.close();
        console.timeEnd('total-scrape');
        throw error;
    }
}

router.get('/manga/:id', async (req, res) => {
    const mangaId = req.params.id;

    try {
        const data = await scrapeManga(mangaId);
        res.json(data);
    } catch (error) {
        console.error('Error fetching manga:', error);
        res.status(500).json({ error: 'Failed to fetch manga data' });
    }
});

module.exports = router;


module.exports = (browser) => {
    const router = require('express').Router();

    const mangaDetailCache = new LRUCache({
        max: 300,
        ttl: 1000 * 60 * 10, // 10 mins
    });

    router.get('/manga/:id', async (req, res) => {
        const mangaId = req.params.id;

        const cached = mangaDetailCache.get(mangaId);
        if (cached) return res.json(cached);

        try {
            const data = await scrapeManga(mangaId, browser);
            mangaDetailCache.set(mangaId, data);
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch manga data' });
        }
    });

    return router;
};
const t1 = performance.now();
console.log(`⏱️ scrapeManga completed in ${(t1 - t0).toFixed(2)}ms`);
