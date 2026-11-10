const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function recordTransitions() {
  const screenshotsDir = path.resolve('/app/applet/public/screenshots');
  const artifactsDir = path.resolve('/.aistudio/artifacts/brain/452a5bdb-e613-4d11-a07a-73b3f2777a16');
  
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  const tempVideoDir = path.resolve('/tmp/playwright_video_fresh');
  if (fs.existsSync(tempVideoDir)) {
    fs.rmSync(tempVideoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempVideoDir, { recursive: true });

  console.log('Launching browser with video recording...');
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

  // 1. Home resting state
  console.log('State: Home resting state');
  await page.waitForTimeout(1200);

  // 2. Open chat from bottom input "Talk to Nova…"
  console.log('Action: Clicking bottom "Talk to Nova…" to trigger OPEN transition...');
  const bottomInput = page.locator('button[aria-label="Talk to Nova"]');
  await bottomInput.waitFor({ state: 'visible', timeout: 10000 });
  await bottomInput.click();

  // Wait for opening transition (440ms animation + settling)
  await page.waitForTimeout(1400);

  // 3. Close chat via X button
  console.log('Action: Clicking "X" button to trigger CLOSE transition...');
  const closeBtn = page.locator('button[aria-label="Close"]');
  await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await closeBtn.click();

  // Wait for closing transition (380ms animation + settling)
  await page.waitForTimeout(1400);

  // 4. Open chat via "Plan B" button on Today's suggestion card
  console.log('Action: Clicking "Plan B" on Today card to trigger OPEN transition...');
  const planBBtn = page.locator('button:has-text("Plan B")').first();
  await planBBtn.waitFor({ state: 'visible', timeout: 5000 });
  await planBBtn.click();

  // Wait for opening transition + proactive options
  await page.waitForTimeout(1400);

  // 5. Close again via X button
  console.log('Action: Clicking "X" button to trigger CLOSE transition...');
  const closeBtn2 = page.locator('button[aria-label="Close"]');
  await closeBtn2.waitFor({ state: 'visible', timeout: 5000 });
  await closeBtn2.click();

  await page.waitForTimeout(1400);

  // Get video handle before closing page
  const video = page.video();
  console.log('Closing page to flush video stream...');
  await page.close();
  
  const videoPath = await video.path();
  console.log(`Video saved and flushed to: ${videoPath}`);

  await context.close();
  await browser.close();

  const targetMp4Public = path.join(screenshotsDir, 'nova_transition.mp4');
  const targetGifPublic = path.join(screenshotsDir, 'nova_transition.gif');
  const targetWebmPublic = path.join(screenshotsDir, 'nova_transition.webm');
  
  const targetMp4Artifact = path.join(artifactsDir, 'nova_transition.mp4');
  const targetGifArtifact = path.join(artifactsDir, 'nova_transition.gif');

  // Copy raw webm
  fs.copyFileSync(videoPath, targetWebmPublic);

  // Convert to high-quality MP4 using ffmpeg
  console.log('Converting to MP4...');
  execSync(`/usr/bin/ffmpeg -y -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 20 "${targetMp4Public}"`);
  fs.copyFileSync(targetMp4Public, targetMp4Artifact);
  console.log(`Created MP4 at ${targetMp4Public}`);

  // Convert to high-quality animated GIF (20 fps, 390px width with lanczos filter and bayer dithering)
  console.log('Converting to smooth GIF...');
  execSync(`/usr/bin/ffmpeg -y -i "${videoPath}" -vf "fps=20,scale=390:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" "${targetGifPublic}"`);
  fs.copyFileSync(targetGifPublic, targetGifArtifact);
  console.log(`Created GIF at ${targetGifPublic}`);

  console.log('Recording and conversion finished successfully!');
}

recordTransitions().catch(err => {
  console.error('Error during recording:', err);
  process.exit(1);
});
