const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '../public/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 440, height: 920 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Click on Memory tab
  console.log('Clicking Memory tab...');
  const memoryTabBtn = page.locator('nav button:has-text("Memory")');
  await memoryTabBtn.click();
  await page.waitForTimeout(600);

  // Capture Level 1 Top
  await page.screenshot({ path: path.join(screenshotsDir, '01_memory_top.png') });
  console.log('Captured 01_memory_top.png');

  // Scroll to show "Can I check something?"
  const checkSection = page.locator('h2:has-text("Can I check something?")');
  await checkSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '02_memory_unconfirmed_group.png') });
  console.log('Captured 02_memory_unconfirmed_group.png');

  // 2. Open unconfirmed observation detail
  console.log('Opening unconfirmed observation detail sheet...');
  const unconfirmedCard = page.locator('text=You seem to prefer quiet forest ambients').first();
  await unconfirmedCard.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '05_memory_unconfirmed_detail.png') });
  console.log('Captured 05_memory_unconfirmed_detail.png');

  // Close sheet
  const closeBtn = page.locator('button[aria-label="Close details"]');
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Scroll up to confirmed memory card to open detail sheet
  console.log('Opening confirmed memory detail sheet...');
  const confirmedCard = page.locator('text=Preferred midday walking window is 1:15 PM – 1:45 PM').first();
  await confirmedCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await confirmedCard.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '03_memory_confirmed_detail.png') });
  console.log('Captured 03_memory_confirmed_detail.png');

  // 4. Click "Talk to Nova" from detail sheet
  console.log('Opening Talk to Nova conversation sheet...');
  const talkToNovaBtn = page.locator('button:has-text("Talk to Nova")').last();
  await talkToNovaBtn.click();
  await page.waitForTimeout(600);

  // Click a quick preset modification chip
  const presetBtn = page.locator('button:has-text("Move walking window to 2:00 PM – 2:30 PM")');
  if (await presetBtn.isVisible()) {
    await presetBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(screenshotsDir, '04_memory_talk_to_nova_staged.png') });
  console.log('Captured 04_memory_talk_to_nova_staged.png');

  // Close dialogue without confirming (or confirm update)
  const confirmUpdateBtn = page.locator('button:has-text("Confirm & update memory")');
  await confirmUpdateBtn.click();
  await page.waitForTimeout(800);

  // 5. Open a memory and trigger Delete modal
  const itemToDel = page.locator('text=Zero pace tracking, speed metrics').first();
  await itemToDel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await itemToDel.click();
  await page.waitForTimeout(600);

  const deleteBtn = page.locator('button[aria-label="Delete this memory"]');
  await deleteBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '06_memory_delete_modal.png') });
  console.log('Captured 06_memory_delete_modal.png');

  await browser.close();
  console.log('All 6 verification screenshots captured successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
