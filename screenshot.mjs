import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Find next available number
const existing = fs.readdirSync(screenshotDir).filter(f => f.startsWith('screenshot-'));
let maxNum = 0;
for (const f of existing) {
  const match = f.match(/^screenshot-(\d+)/);
  if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
}
const num = maxNum + 1;
const filename = label ? `screenshot-${num}-${label}.png` : `screenshot-${num}.png`;
const outputPath = path.join(screenshotDir, filename);

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  // Wait for fonts to load
  await new Promise(r => setTimeout(r, 1500));
  // Scroll through the page to trigger IntersectionObserver reveals
  await page.evaluate(async () => {
    const distance = 400;
    const delay = 150;
    const scrollHeight = document.body.scrollHeight;
    for (let i = 0; i < scrollHeight; i += distance) {
      window.scrollBy(0, distance);
      await new Promise(r => setTimeout(r, delay));
    }
    // Scroll back to top for the full-page screenshot
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
  });
  // Wait for reveal animations to finish
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Screenshot saved: ${outputPath}`);
  await browser.close();
})();
