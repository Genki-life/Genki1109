const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function capture() {
  const outputDirs = [
    path.resolve('/app/applet/public/screenshots'),
    path.resolve('/.aistudio/artifacts/brain/31f8a46f-dbee-434e-a807-349462686956')
  ];

  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  async function saveScreenshot(filename) {
    for (const dir of outputDirs) {
      const filePath = path.join(dir, filename);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved screenshot to ${filePath}`);
    }
  }

  // 1. Initial Home Screen with single recommendation and "Find another way" hint
  console.log('Capturing Home with Plan B hint...');
  await saveScreenshot('1_home_initial_with_hint.png');

  // 2. Click "Plan B" on initial recommendation
  console.log('Clicking "Plan B" on initial card...');
  const planBBtn = await page.locator('button:has-text("Plan B")').first();
  await planBBtn.click();
  await page.waitForTimeout(600);
  console.log('Capturing Plan B Chat with 3 options...');
  await saveScreenshot('2_plan_b_proactive_options.png');

  // 3. Click "Show me another option" in chat
  console.log('Clicking "Show me another option"...');
  const showAnotherBtn = await page.locator('button:has-text("Show me another option")');
  if (await showAnotherBtn.count() > 0) {
    await showAnotherBtn.click();
    await page.waitForTimeout(600);
    console.log('Capturing chat after Show me another option...');
    await saveScreenshot('3_chat_second_option.png');
  }

  // 4. Click "Sounds good" on the stretch recommendation or tomorrow option
  console.log('Accepting option via "Sounds good"...');
  const soundsGoodInChat = await page.locator('div.flex.flex-wrap button:has-text("Sounds good")').first();
  if (await soundsGoodInChat.count() > 0) {
    await soundsGoodInChat.click();
    await page.waitForTimeout(600);
    console.log('Capturing Home screen after accepting alternative plan...');
    await saveScreenshot('4_home_updated_plan_accepted.png');
  }

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
