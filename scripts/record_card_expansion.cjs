const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function runCardExpansionRecording() {
  const screenshotsDir = path.resolve('/app/applet/public/screenshots');
  const artifactsDir = path.resolve('/.aistudio/artifacts/brain/452a5bdb-e613-4d11-a07a-73b3f2777a16');

  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  const tempVideoDir = path.resolve('/tmp/card_expansion_video');
  if (fs.existsSync(tempVideoDir)) {
    fs.rmSync(tempVideoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempVideoDir, { recursive: true });

  console.log('Launching browser for Suggested -> Accepted Plan Card Transition recording...');
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: tempVideoDir,
      size: { width: 390, height: 844 }
    }
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot: Suggested State
  await page.screenshot({ path: path.join(screenshotsDir, 'card_state_1_suggested.png') });
  console.log('Saved card_state_1_suggested.png');

  // ==========================================
  // SCENARIO 1: Standard screen (390x844) - Click "Sounds good" & smooth downward expansion
  // ==========================================
  console.log('--- SCENARIO 1: Clicking "Sounds good" on standard viewport ---');
  const soundsGoodBtn = page.locator('button:has-text("Sounds good")').first();
  await soundsGoodBtn.waitFor({ state: 'visible', timeout: 5000 });

  // Click Sounds good
  await soundsGoodBtn.click();

  // Capture mid-expansion frame (~180ms)
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(screenshotsDir, 'card_state_mid_expansion.png') });
  console.log('Saved card_state_mid_expansion.png');

  // Wait for expansion to fully settle (~600ms)
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, 'card_state_2_accepted.png') });
  console.log('Saved card_state_2_accepted.png');

  await page.waitForTimeout(1000);

  // ==========================================
  // SCENARIO 2: Short screen (390x680) - Suggested -> Accepted & natural scrolling
  // ==========================================
  console.log('--- SCENARIO 2: Short screen (390x680) expansion and natural scrolling ---');
  // Reload page to reset to suggested state
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 390, height: 680 });
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(screenshotsDir, 'short_screen_suggested.png') });
  console.log('Saved short_screen_suggested.png');

  // Click Sounds good on short screen
  const soundsGoodBtnShort = page.locator('button:has-text("Sounds good")').first();
  await soundsGoodBtnShort.waitFor({ state: 'visible', timeout: 5000 });
  await soundsGoodBtnShort.click();

  // Wait for smooth downward expansion
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(screenshotsDir, 'short_screen_accepted_before_scroll.png') });
  console.log('Saved short_screen_accepted_before_scroll.png');

  // Test natural scroll on short screen: scroll down 140px to view bottom actions cleanly
  console.log('Testing natural scroll on short screen...');
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTo({ top: 140, behavior: 'smooth' });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(screenshotsDir, 'short_screen_scrolled_to_actions.png') });
  console.log('Saved short_screen_scrolled_to_actions.png');

  // Scroll back to top
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  });
  await page.waitForTimeout(1000);

  // Restore standard viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  console.log('Finalizing video recording...');
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const rawVideoPath = await video.path();
    console.log(`Raw video saved to: ${rawVideoPath}`);

    const targetMp4Path = path.join(screenshotsDir, 'card_expansion.mp4');
    const targetGifPath = path.join(screenshotsDir, 'card_expansion.gif');
    const artifactMp4Path = path.join(artifactsDir, 'card_expansion.mp4');
    const artifactGifPath = path.join(artifactsDir, 'card_expansion.gif');

    try {
      console.log('Transcoding to MP4 with H.264...');
      execSync(`ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${targetMp4Path}"`);
      execSync(`cp "${targetMp4Path}" "${artifactMp4Path}"`);
      console.log(`Saved MP4: ${targetMp4Path}`);

      console.log('Transcoding to GIF...');
      execSync(`ffmpeg -y -i "${rawVideoPath}" -vf "fps=16,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" "${targetGifPath}"`);
      execSync(`cp "${targetGifPath}" "${artifactGifPath}"`);
      console.log(`Saved GIF: ${targetGifPath}`);
    } catch (e) {
      console.error('ffmpeg conversion error:', e.message);
    }
  }

  console.log('Card expansion verification finished successfully!');
}

runCardExpansionRecording().catch(err => {
  console.error('Error during card expansion recording:', err);
  process.exit(1);
});
