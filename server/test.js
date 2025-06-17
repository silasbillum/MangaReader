const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.goto('https://www.mangakakalot.gg/manga/kingdom', { waitUntil: 'networkidle2' });
        console.log('Page loaded successfully');
        await browser.close();
    } catch (error) {
        console.error('Error:', error);
    }
})();
