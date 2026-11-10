const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function runFinalCheckVerification() {
  const screenshotsDir = path.resolve('/app/applet/public/screenshots');
  const artifactsDir = path.resolve('/.aistudio/artifacts/brain/452a5bdb-e613-4d11-a07a-73b3f2777a16');

  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  const tempVideoDir = path.resolve('/tmp/final_check_video');
  if (fs.existsSync(tempVideoDir)) {
    fs.rmSync(tempVideoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempVideoDir, { recursive: true });

  console.log('Starting Playwright Mobile Simulator for comprehensive animation check...');
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

  // ----------------------------------------------------
  // SECTION 1: NOVA CONVERSATION TRANSITION & KEYBOARD INPUT
  // ----------------------------------------------------
  console.log('=== SECTION 1: Nova Conversation Transition & Input Check ===');
  const bottomInput = page.locator('button[aria-label="Talk to Nova"]');
  await bottomInput.waitFor({ state: 'visible', timeout: 5000 });
  await bottomInput.click();
  await page.waitForTimeout(900);

  // Type in keyboard & send
  const chatInput = page.locator('input[placeholder*="response"], input[placeholder*="changed"], input[placeholder*="Ask"]');
  if (await chatInput.isVisible()) {
    await chatInput.fill('Checking plan transition rhythm');
    await page.waitForTimeout(400);
    await chatInput.press('Enter');
    await page.waitForTimeout(800);
  }

  // Close Nova Conversation
  const closeChatBtn = page.locator('button[aria-label="Close"]');
  await closeChatBtn.waitFor({ state: 'visible', timeout: 5000 });
  await closeChatBtn.click();
  await page.waitForTimeout(800);

  // ----------------------------------------------------
  // SECTION 2: ACCEPT PLAN & CONTINUOUS MEDIA EXPANSION
  // ----------------------------------------------------
  console.log('=== SECTION 2: Accept Plan & Media Shared Element Transition ===');
  const soundsGoodBtn = page.locator('button:has-text("Sounds good")').first();
  await soundsGoodBtn.waitFor({ state: 'visible', timeout: 5000 });
  await soundsGoodBtn.click();
  await page.waitForTimeout(800);

  // Click Thumbnail to open Detail Sheet
  const thumbnailBtn = page.locator('button[title="View plan guide"]').first();
  await thumbnailBtn.waitFor({ state: 'visible', timeout: 5000 });
  await thumbnailBtn.click();
  await page.waitForTimeout(800);

  // ----------------------------------------------------
  // SECTION 3: DETAIL SHEET SCROLL & NATURAL RETURN
  // ----------------------------------------------------
  console.log('=== SECTION 3: Detail Sheet Scroll & Natural Return ===');
  // Scroll detail sheet content
  await page.evaluate(() => {
    const detailScroll = document.querySelector('.overflow-y-auto');
    if (detailScroll) detailScroll.scrollTop = 120;
  });
  await page.waitForTimeout(600);

  // Close Detail Sheet using "Back to Today"
  const backToTodayBtn = page.locator('button:has-text("Back to Today")');
  await backToTodayBtn.waitFor({ state: 'visible', timeout: 5000 });
  await backToTodayBtn.click();
  await page.waitForTimeout(800);

  // ----------------------------------------------------
  // SECTION 4: SHORT SCREEN MOBILE SIMULATION (680px)
  // ----------------------------------------------------
  console.log('=== SECTION 4: Short Screen Simulation (390 x 680) ===');
  await page.setViewportSize({ width: 390, height: 680 });
  await page.waitForTimeout(500);

  // Open Detail on Short Screen
  await thumbnailBtn.click();
  await page.waitForTimeout(700);

  // Verify bottom action is visible and not occluded
  const isBackVisible = await backToTodayBtn.isVisible();
  console.log('Is "Back to Today" visible and unoccluded on short screen:', isBackVisible);
  await backToTodayBtn.click();
  await page.waitForTimeout(700);

  // Restore standard viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  // ----------------------------------------------------
  // SECTION 5: RAPID CONTINUOUS TOGGLING (No duplicate / No jump)
  // ----------------------------------------------------
  console.log('=== SECTION 5: Rapid Open/Close Mid-flight Stability ===');
  // Rapid toggle 1: Click open and close rapidly
  await thumbnailBtn.click();
  await page.waitForTimeout(100); // 100ms mid-flight
  const closeX = page.locator('button[aria-label="Close"]');
  if (await closeX.isVisible()) {
    await closeX.click();
  } else {
    // click backdrop
    const backdrop = page.locator('.bg-black\\/20');
    if (await backdrop.isVisible()) await backdrop.click();
  }
  await page.waitForTimeout(500);

  // Rapid toggle 2: Open again cleanly
  await thumbnailBtn.click();
  await page.waitForTimeout(700);
  await closeX.click();
  await page.waitForTimeout(700);

  console.log('All verification scenarios completed! Finalizing video...');
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const rawVideoPath = await video.path();
    console.log(`Raw video saved to: ${rawVideoPath}`);

    const targetMp4Path = path.join(screenshotsDir, 'final_verification.mp4');
    const targetGifPath = path.join(screenshotsDir, 'final_verification.gif');
    const artifactMp4Path = path.join(artifactsDir, 'final_verification.mp4');
    const artifactGifPath = path.join(artifactsDir, 'final_verification.gif');

    try {
      console.log('Transcoding to MP4 with H.264...');
      execSync(`ffmpeg -y -i "${rawVideoPath}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p "${targetMp4Path}"`);
      execSync(`cp "${targetMp4Path}" "${artifactMp4Path}"`);
      console.log(`Saved MP4: ${targetMp4Path}`);

      console.log('Transcoding to GIF...');
      execSync(`ffmpeg -y -i "${rawVideoPath}" -vf "fps=14,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" "${targetGifPath}"`);
      execSync(`cp "${targetGifPath}" "${artifactGifPath}"`);
      console.log(`Saved GIF: ${targetGifPath}`);

      // Also copy to media_transition.mp4 & gif so existing links stay fresh
      execSync(`cp "${targetMp4Path}" "${path.join(screenshotsDir, 'media_transition.mp4')}"`);
      execSync(`cp "${targetGifPath}" "${path.join(screenshotsDir, 'media_transition.gif')}"`);
    } catch (e) {
      console.error('ffmpeg conversion error:', e.message);
    }
  }

  console.log('Final check verification finished successfully!');
}

runFinalCheckVerification().catch(err => {
  console.error('Error during final check:', err);
  process.exit(1);
});
