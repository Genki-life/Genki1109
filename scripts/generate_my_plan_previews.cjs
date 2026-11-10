const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function run() {
  const screenshotsDir = path.resolve('/app/applet/public/screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Initial Today Screen
  await page.screenshot({ path: path.join(screenshotsDir, 'today_initial.png') });
  console.log('Today screen captured.');

  // 2. Switch to My Plan
  const navInfo = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('My Plan'));
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  if (navInfo) {
    await page.mouse.click(navInfo.x, navInfo.y);
  }
  await page.waitForTimeout(800);

  // Capture My Plan top view
  await page.screenshot({ path: path.join(screenshotsDir, 'my_plan_top_overview.png') });
  console.log('My Plan top overview captured.');

  // Scroll My Plan view down to show Your Direction & Health Data
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('section')?.parentElement;
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'my_plan_scrolled_metrics.png') });
  console.log('My Plan scrolled metrics captured.');

  // Scroll back to top and click Activity detail
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('section')?.parentElement;
    if (scrollContainer) scrollContainer.scrollTop = 0;
  });
  await page.waitForTimeout(400);

  const activitySectionPos = await page.evaluate(() => {
    const sec = document.querySelector('section[aria-label="View Activity details"]');
    if (!sec) return null;
    const rect = sec.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + 24 };
  });
  if (activitySectionPos) {
    await page.mouse.click(activitySectionPos.x, activitySectionPos.y);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'my_plan_detail_sheet.png') });
  console.log('My Plan detail sheet captured.');

  // Close detail sheet
  const closeBtnPos = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Close detail"]');
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  if (closeBtnPos) {
    await page.mouse.click(closeBtnPos.x, closeBtnPos.y);
  }
  await page.waitForTimeout(800);

  // Switch back to Today
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Today'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'today_page_preserved.png') });
  console.log('Today page preserved screenshot captured.');

  await browser.close();
  console.log('All My Plan screenshots generated successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
