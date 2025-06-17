const express = require('express');
const puppeteer = require('puppeteer');

const router = express.Router();

async function scrapeManga(id) {
  const url = `https://www.mangakakalot.gg/manga/${id}`;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Title
    const title = await page.$eval('h1', el => el.textContent.trim());

    // Cover image
      const coverImage = await page.$eval('img.lazy', img => img.src);


    // Description
      const description = await page.$eval('#contentBox', el => {
          // Get the inner text (with all paragraphs)
          let text = el.innerText || el.textContent || '';

          // Optional: clean up excessive whitespace and line breaks
          text = text.replace(/\n+/g, '\n').trim();

          return text;
      });



    // Author(s) - often under info items with label "Author(s):"
      const authors = await page.$$eval('li', lis => {
          // Find the <li> which contains "Author(s) :"
          const authorLi = lis.find(li => li.textContent.includes('Author(s) :'));
          if (!authorLi) return [];

          // Grab all <a> inside that <li> and return their text trimmed
          return Array.from(authorLi.querySelectorAll('a')).map(a => a.textContent.trim());
      });


    // Status (Ongoing/Completed)
      const status = await page.$$eval('li', lis => {
          const statusLi = lis.find(li => li.textContent.includes('Status :'));
          if (!statusLi) return '';
          return statusLi.textContent.replace('Status :', '').trim();
      });


    // Genres (array of genre names)
      const genres = await page.$$eval('.genres a', els => els.map(el => el.textContent.trim()));


    // Chapters list (array of { title, url, date })
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
          }).filter(Boolean); // Remove any null entries
      });


    await browser.close();

    return { id, title, coverImage, description, authors, status, genres, chapters };

  } catch (error) {
    if (browser) await browser.close();
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
