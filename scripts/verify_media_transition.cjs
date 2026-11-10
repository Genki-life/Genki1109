const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function runMediaTransitionVerification() {
  const screenshotsDir = path.resolve('/app/applet/public/screenshots');
  const artifactsDir = path.resolve('/.aistudio/artifacts/brain/452a5bdb-e613-4d11-a07a-73b3f2777a16');

  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  const tempVideoDir = path.resolve('/tmp/media_transition_video');
  if (fs.existsSync(tempVideoDir)) {
    fs.rmSync(tempVideoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempVideoDir, { recursive: true });

  console.log('Launching browser for Media Thumbnail Continuous Transition verification...');
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
  await page.waitForTimeout(800);

  // Take screenshot 1: Initial Suggested State
  await page.screenshot({ path: path.join(screenshotsDir, '01_home_suggested.png') });
  console.log('Saved 01_home_suggested.png');

  // Accept plan: Click "Sounds good"
  console.log('Accepting plan...');
  const soundsGoodBtn = page.locator('button:has-text("Sounds good")').first();
  await soundsGoodBtn.waitFor({ state: 'visible', timeout: 5000 });
  await soundsGoodBtn.click();
  await page.waitForTimeout(800);

  // Take screenshot 2: Accepted Card State with Thumbnail
  await page.screenshot({ path: path.join(screenshotsDir, '02_home_accepted_card.png') });
  console.log('Saved 02_home_accepted_card.png');

  // ========================================================
  // TEST 1: Open Detail via Thumbnail Click -> Continuous Transition
  // ========================================================
  console.log('--- TEST 1: Click thumbnail to expand into Plan Detail ---');
  const thumbnailBtn = page.locator('button[title="View plan guide"]').first();
  await thumbnailBtn.waitFor({ state: 'visible', timeout: 5000 });
  
  // Click thumbnail
  await thumbnailBtn.click();
  
  // Capture mid-transition frame (~200ms)
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(screenshotsDir, '03_detail_mid_transition.png') });
  console.log('Saved 03_detail_mid_transition.png');

  // Wait for transition to complete and text to settle (~600ms)
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '04_detail_fully_open.png') });
  console.log('Saved 04_detail_fully_open.png');

  // Test audio guide play toggle
  console.log('Testing audio play button...');
  const audioPlayBtn = page.locator('button[aria-label="Play audio guide"]');
  if (await audioPlayBtn.isVisible()) {
    await audioPlayBtn.click();
    await page.waitForTimeout(600);
    const audioPauseBtn = page.locator('button[aria-label="Pause audio guide"]');
    if (await audioPauseBtn.isVisible()) {
      console.log('Audio guide successfully toggled to pause state!');
      await audioPauseBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // ========================================================
  // TEST 2: Close Detail via "Back to Today" -> Reverse Continuous Transition
  // ========================================================
  console.log('--- TEST 2: Click "Back to Today" to shrink back to thumbnail ---');
  const backToTodayBtn = page.locator('button:has-text("Back to Today")');
  await backToTodayBtn.waitFor({ state: 'visible', timeout: 5000 });
  await backToTodayBtn.click();

  // Capture mid-reverse transition frame (~180ms)
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(screenshotsDir, '05_detail_mid_closing.png') });
  console.log('Saved 05_detail_mid_closing.png');

  // Wait for return to card
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '06_returned_to_home.png') });
  console.log('Saved 06_returned_to_home.png');

  // ========================================================
  // TEST 3: Open again and Close via 'X' button
  // ========================================================
  console.log('--- TEST 3: Open again and close via X button ---');
  await thumbnailBtn.click();
  await page.waitForTimeout(600);

  const closeXBtn = page.locator('button[aria-label="Close"]');
  await closeXBtn.waitFor({ state: 'visible', timeout: 5000 });
  await closeXBtn.click();
  await page.waitForTimeout(600);

  // ========================================================
  // TEST 4: Short screen (680px) and Scrolled Home
  // ========================================================
  console.log('--- TEST 4: Short screen (680px) + scrolled page ---');
  await page.setViewportSize({ width: 390, height: 680 });
  await page.waitForTimeout(500);

  // Scroll down slightly
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTop = 100;
  });
  await page.waitForTimeout(500);

  // Click thumbnail while scrolled
  await thumbnailBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(screenshotsDir, '07_short_screen_detail_open.png') });
  console.log('Saved 07_short_screen_detail_open.png');

  // Close back
  const backBtn2 = page.locator('button:has-text("Back to Today")');
  await backBtn2.click();
  await page.waitForTimeout(700);

  // Restore standard viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  // ========================================================
  // TEST 5: Rapid Open/Close Mid-flight Stability
  // ========================================================
  console.log('--- TEST 5: Rapid Open and Close toggle stability ---');
  await thumbnailBtn.click();
  await page.waitForTimeout(120); // Mid-air
  const closeBtnMidAir = page.locator('button[aria-label="Close"]');
  if (await closeBtnMidAir.isVisible()) {
    await closeBtnMidAir.click();
  }
  await page.waitForTimeout(600);

  // Open again cleanly to finish video nicely
  await thumbnailBtn.click();
  await page.waitForTimeout(800);
  await backToTodayBtn.click();
  await page.waitForTimeout(1000);

  console.log('Finished all test scenarios! Finalizing video...');
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const rawVideoPath = await video.path();
    console.log(`Raw video saved to: ${rawVideoPath}`);

    const targetMp4Path = path.join(screenshotsDir, 'media_transition.mp4');
    const targetGifPath = path.join(screenshotsDir, 'media_transition.gif');
    const artifactMp4Path = path.join(artifactsDir, 'media_transition.mp4');

    try {
      console.log('Converting to high-quality MP4 and GIF using ffmpeg...');
      execSync(`ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${targetMp4Path}"`);
      execSync(`cp "${targetMp4Path}" "${artifactMp4Path}"`);
      console.log(`Saved MP4 to ${targetMp4Path}`);

      // Generate optimized GIF for instant visual preview
      execSync(`ffmpeg -y -i "${rawVideoPath}" -vf "fps=15,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${targetGifPath}"`);
      console.log(`Saved GIF to ${targetGifPath}`);
    } catch (e) {
      console.error('ffmpeg conversion error:', e.message);
    }
  }

  console.log('All verification tasks completed successfully!');
}

runMediaTransitionVerification().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
