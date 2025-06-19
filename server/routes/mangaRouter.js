const express = require('express');
const puppeteer = require('puppeteer');

const router = express.Router();

async function scrapeManga(id) {
    const url = `https://www.mangakakalot.gg/manga/${id}`;
    let browser;

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
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
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
            return rows.map(row => {
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
