const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function captureAllPreviews() {
  const outputDirs = [
    path.resolve('/app/applet/public/screenshots'),
    path.resolve('/.aistudio/artifacts/brain/31f8a46f-dbee-434e-a807-349462686956')
  ];

  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 420, height: 890 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  async function saveScreenshot(filename, locator) {
    for (const dir of outputDirs) {
      const filePath = path.join(dir, filename);
      if (locator) {
        await locator.screenshot({ path: filePath });
      } else {
        await page.screenshot({ path: filePath });
      }
      console.log(`Saved screenshot to ${filePath}`);
    }
  }

  const phoneFrame = page.locator('div.max-w-\\[393px\\]').first();

  // 1. 首页建议状态 (Home suggested state)
  console.log('1. Capturing Home Suggested State...');
  await saveScreenshot('preview_1_home_suggested.png', phoneFrame);

  // 2. 计划详情 (Plan detail sheet)
  console.log('2. Opening Plan Details...');
  // First accept or view detail: in suggested state, let's click "Sounds good" to get accepted state
  const soundsGoodBtn = page.locator('button:has-text("Sounds good")').first();
  await soundsGoodBtn.click();
  await page.waitForTimeout(600);

  // Now in Accepted state:
  console.log('3. Capturing Home Accepted State...');
  await saveScreenshot('preview_2_home_accepted.png', phoneFrame);

  // Open Plan Detail sheet via media thumbnail
  console.log('4. Opening Plan Details Sheet...');
  const detailThumbBtn = page.locator('button[title="View plan guide"]').first();
  await detailThumbBtn.click();
  await page.waitForTimeout(600);
  await saveScreenshot('preview_5_plan_details.png', phoneFrame);

  // Close Plan Detail sheet
  const closeDetailBtn = page.locator('button[aria-label="Close"]').first();
  await closeDetailBtn.click();
  await page.waitForTimeout(500);

  // Reload page to start fresh for Plan B conversation
  console.log('Reloading to test Plan B conversation...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 3. 点击 Plan B 后的对话 (Chat after clicking Plan B)
  console.log('5. Clicking Plan B on initial suggestion...');
  const planBInitialBtn = page.locator('button:has-text("Plan B")').first();
  await planBInitialBtn.click();
  await page.waitForTimeout(600);
  await saveScreenshot('preview_3_chat_plan_b_initial.png', phoneFrame);

  // 4. 连续选择 “Show me another option” 后的对话 (Chat after consecutive 'Show me another option')
  console.log('6. Clicking first "Show me another option"...');
  const showAnother1 = page.locator('button:has-text("Show me another option")').last();
  await showAnother1.click();
  await page.waitForTimeout(600);

  console.log('7. Clicking second "Show me another option"...');
  const showAnother2 = page.locator('button:has-text("Show me another option")').last();
  await showAnother2.click();
  await page.waitForTimeout(700);

  console.log('8. Capturing Chat with multiple options and collapsed unselected operations...');
  await saveScreenshot('preview_4_chat_consecutive_options.png', phoneFrame);

  await browser.close();
  console.log('All 5 preview screenshots captured successfully!');
}

captureAllPreviews().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
