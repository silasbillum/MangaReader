const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

let browser;

// Launch browser once when app starts
async function launchBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: 'new', // or true depending on Puppeteer version
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
            ],
            defaultViewport: {
                width: 800,
                height: 600,
            },
        });
    }
    return browser;
}

app.get('/api/imageProxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).send('Invalid "url" parameter');
    }

    try {
        const browser = await launchBrowser();
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36'
        );

        await page.setExtraHTTPHeaders({
            Referer: 'https://www.mangakakalot.gg',
        });

        // Go directly to the image URL and wait until network is idle
        await page.goto(imageUrl, { waitUntil: 'networkidle2' });

        // Evaluate the image as an ArrayBuffer and convert to Buffer
        const imageBuffer = await page.evaluate(async () => {
            const response = await fetch(window.location.href);
            const buffer = await response.arrayBuffer();
            return Array.from(new Uint8Array(buffer));
        });

        // Close the page to free resources
        await page.close();

        // Determine content type from URL extension (optional)
        let contentType = 'image/jpeg';
        const ext = imageUrl.split('.').pop().toLowerCase();
        if (ext === 'webp') contentType = 'image/webp';
        else if (ext === 'png') contentType = 'image/png';
        else if (ext === 'gif') contentType = 'image/gif';

        res.set('Content-Type', contentType);
        res.send(Buffer.from(imageBuffer));
    } catch (error) {
        console.error('❌ Puppeteer proxy error:', error);
        res.status(500).send('Image proxy error');
    }
});

// Optional: graceful shutdown to close browser when app stops
process.on('SIGINT', async () => {
    if (browser) await browser.close();
    process.exit();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
