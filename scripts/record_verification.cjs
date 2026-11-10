const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function runVerificationRecording() {
  const screenshotsDir = path.resolve('/app/applet/public/screenshots');
  const artifactsDir = path.resolve('/.aistudio/artifacts/brain/452a5bdb-e613-4d11-a07a-73b3f2777a16');

  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  const tempVideoDir = path.resolve('/tmp/playwright_verify_video');
  if (fs.existsSync(tempVideoDir)) {
    fs.rmSync(tempVideoDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempVideoDir, { recursive: true });

  console.log('Launching browser for full 5-scenario verification recording...');
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

  // ==========================================
  // SCENARIO 1: 首页建议状态下打开、关闭对话
  // ==========================================
  console.log('--- SCENARIO 1: Suggested state Open & Close ---');
  await page.waitForTimeout(800);

  // Click "Talk to Nova…"
  const bottomInput = page.locator('button[aria-label="Talk to Nova"]');
  await bottomInput.waitFor({ state: 'visible', timeout: 5000 });
  await bottomInput.click();
  await page.waitForTimeout(1100);

  // Close via X button
  const closeBtn = page.locator('button[aria-label="Close"]');
  await closeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await closeBtn.click();
  await page.waitForTimeout(1100);

  // ==========================================
  // SCENARIO 2: 接受建议后，从 Plan B 打开、关闭对话
  // ==========================================
  console.log('--- SCENARIO 2: Accepted state -> Plan B Open & Close ---');
  // Click "Sounds good" on initial card
  const soundsGoodBtn = page.locator('button:has-text("Sounds good")').first();
  await soundsGoodBtn.waitFor({ state: 'visible', timeout: 5000 });
  await soundsGoodBtn.click();
  await page.waitForTimeout(800);

  // Click "Plan B" on accepted card
  const acceptedPlanBBtn = page.locator('button:has-text("Plan B")').first();
  await acceptedPlanBBtn.waitFor({ state: 'visible', timeout: 5000 });
  await acceptedPlanBBtn.click();
  await page.waitForTimeout(1100);

  // Close via X button
  await closeBtn.click();
  await page.waitForTimeout(1100);

  // ==========================================
  // SCENARIO 3: 较矮屏幕上滚动首页后打开、关闭对话
  // ==========================================
  console.log('--- SCENARIO 3: Short screen + scrolled Home -> Open & Close ---');
  await page.setViewportSize({ width: 390, height: 680 });
  await page.waitForTimeout(600);

  // Scroll down by 140px in the home container
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) scrollContainer.scrollTop = 140;
  });
  await page.waitForTimeout(600);

  // Open chat from bottom input
  await bottomInput.click();
  await page.waitForTimeout(1100);

  // Close chat
  await closeBtn.click();
  await page.waitForTimeout(1100);

  // Restore standard viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);

  // ==========================================
  // SCENARIO 4: 快速连续打开和关闭
  // ==========================================
  console.log('--- SCENARIO 4: Rapid consecutive Open & Close ---');
  // Click open then immediately click close after 120ms
  await bottomInput.click();
  await page.waitForTimeout(140);
  // Backdrop is already clickable, or close button
  const backdrop = page.locator('.bg-black\\/16');
  if (await backdrop.count() > 0) {
    await backdrop.click({ position: { x: 200, y: 100 }, force: true });
  } else {
    await closeBtn.click({ force: true });
  }
  await page.waitForTimeout(600);

  // Re-open normally to verify stability
  await bottomInput.click();
  await page.waitForTimeout(800);
  await closeBtn.click();
  await page.waitForTimeout(800);

  // ==========================================
  // SCENARIO 5: 键盘弹出后继续输入，再关闭对话
  // ==========================================
  console.log('--- SCENARIO 5: Typing in chat & Close ---');
  await bottomInput.click();
  await page.waitForTimeout(800);

  const textInput = page.locator('input[placeholder*="response"], input[placeholder*="changed"]');
  await textInput.waitFor({ state: 'visible', timeout: 5000 });
  await textInput.fill('Feeling a little tired today');
  await page.waitForTimeout(500);
  await textInput.press('Enter');
  await page.waitForTimeout(1200);

  // Close conversation
  await closeBtn.click();
  await page.waitForTimeout(1200);

  // Finalize video
  console.log('Finalizing recording...');
  const video = page.video();
  await page.close();
  const videoPath = await video.path();
  console.log(`Video saved to: ${videoPath}`);

  await context.close();
  await browser.close();

  const targetMp4Public = path.join(screenshotsDir, 'nova_transition.mp4');
  const targetGifPublic = path.join(screenshotsDir, 'nova_transition.gif');
  const targetWebmPublic = path.join(screenshotsDir, 'nova_transition.webm');

  const targetMp4Artifact = path.join(artifactsDir, 'nova_transition.mp4');
  const targetGifArtifact = path.join(artifactsDir, 'nova_transition.gif');

  // Copy raw webm
  fs.copyFileSync(videoPath, targetWebmPublic);

  // Convert to MP4
  console.log('Converting to MP4...');
  execSync(`/usr/bin/ffmpeg -y -i "${videoPath}" -c:v libx264 -pix_fmt yuv420p -preset slow -crf 20 "${targetMp4Public}"`);
  fs.copyFileSync(targetMp4Public, targetMp4Artifact);
  console.log(`Created MP4 at ${targetMp4Public}`);

  // Convert to high-quality animated GIF
  console.log('Converting to smooth GIF...');
  execSync(`/usr/bin/ffmpeg -y -i "${videoPath}" -vf "fps=16,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" "${targetGifPublic}"`);
  fs.copyFileSync(targetGifPublic, targetGifArtifact);
  console.log(`Created GIF at ${targetGifPublic}`);

  console.log('All 5 scenarios verified and recorded successfully!');
}

runVerificationRecording().catch(err => {
  console.error('Error during recording:', err);
  process.exit(1);
});
