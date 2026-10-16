import { chromium } from 'playwright';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseConfig, previewPath } from '../lib/config.js';

const root = new URL('../', import.meta.url);
const config = parseConfig(JSON.parse(await readFile(new URL('sites.json', root), 'utf8')));
const requested = process.argv.slice(2);
const sites = config.sites.filter(site => !site.hidden && !site.customPreview && (
  !requested.length || requested.includes(new URL(site.url).hostname) || requested.includes(site.url)
));
if (!sites.length) {
  if (requested.length) throw new Error('没有匹配的自动截图站点，请使用完整网址或主机名。');
  console.log('No automatic previews to capture.');
  process.exit(0);
}

await mkdir(new URL('assets/previews/', root), { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PREVIEW_BROWSER_CHANNEL || undefined });
const results = [];

async function capture(site) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
    colorScheme: 'light', reducedMotion: 'reduce', locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response || !response.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
    await page.locator('body').waitFor({ timeout: 10000 });
    if (site.capture.waitFor) await page.locator(site.capture.waitFor).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(site.capture.waitMs);
    await Promise.race([page.evaluate(() => document.fonts.ready), new Promise(resolve => setTimeout(resolve, 3000))]);
    const hasContent = await page.evaluate(() => {
      if (document.body.innerText.trim().length > 0) return true;
      return [...document.querySelectorAll('img, canvas, svg, video, iframe')].some(element => {
        const rect = element.getBoundingClientRect();
        return rect.width > 100 && rect.height > 100 && getComputedStyle(element).visibility !== 'hidden';
      });
    });
    if (!hasContent) throw new Error('页面尚未渲染有效内容');
    if (site.capture.hide.length) {
      await page.addStyleTag({ content: site.capture.hide.map(selector => `${selector} { visibility: hidden !important; }`).join('\n') });
    }
    const image = await page.screenshot({ type: 'jpeg', quality: 82, fullPage: false, animations: 'disabled', timeout: 10000 });
    const destination = new URL(previewPath(site.url), root);
    const temporary = fileURLToPath(destination) + '.tmp';
    await writeFile(temporary, image);
    await rename(temporary, destination);
    console.log(`Saved ${previewPath(site.url)}`);
    results.push({ site: site.url, success: true });
  } catch (error) {
    // Only successful captures replace an existing image. A timeout never publishes an error page.
    console.warn(`Preview unavailable for ${site.url}: ${error.message}`);
    results.push({ site: site.url, success: false, reason: error.message });
  } finally {
    await context.close();
  }
}

try {
  for (let index = 0; index < sites.length; index += 2) await Promise.all(sites.slice(index, index + 2).map(capture));
} finally {
  await browser.close();
}
const successes = results.filter(result => result.success).length;
console.log(`Captured ${successes}/${sites.length} previews; failed sites keep their previous image.`);
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## Website previews\n\n${results.map(result => `- ${result.success ? '✓' : '⚠'} ${result.site}${result.success ? '' : ' — previous image retained / placeholder if none exists'}`).join('\n')}\n`);
}
if (successes === 0) process.exitCode = 1;
