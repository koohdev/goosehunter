import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = 'c:\\Users\\kochi\\OneDrive\\Desktop\\(01)-DEVELOPMENT\\06_PRACTICE\\web-game-shooter\\goosehunter\\public\\images';

async function buildCleanShotgun() {
  const cleanInput = path.join(publicDir, 'shotgun-fps-clean.png');
  const { data, info } = await sharp(cleanInput).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Let's create an 800x800 canvas with the gun centered
  const targetW = 800;
  const targetH = 800;
  const buffer = Buffer.alloc(targetW * targetH * 4, 0);

  // In source, barrel tip is at x ~ 512, y ~ 92.
  // We want barrel tip at x ~ 400, y ~ 40 in target.
  const offsetX = 400 - 512;
  const offsetY = 40 - 92;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels;
      const alpha = data[srcIdx + 3];
      if (alpha < 15) continue;

      const tx = x + offsetX;
      const ty = y + offsetY;

      if (tx >= 0 && tx < targetW && ty >= 0 && ty < targetH) {
        const tgtIdx = (ty * targetW + tx) * 4;
        buffer[tgtIdx] = data[srcIdx];
        buffer[tgtIdx + 1] = data[srcIdx + 1];
        buffer[tgtIdx + 2] = data[srcIdx + 2];
        buffer[tgtIdx + 3] = alpha;
      }
    }
  }

  // Also add a left glove hand supporting the wooden forearm on the left (x ~ 280 to 390, y ~ 520 to 650)
  // Let's copy and mirror glove pixels from right hand (right hand glove is at x ~ 700-920, y ~ 720-950 in target)
  // to give a solid authentic two-handed FPS grip!
  for (let y = 520; y < 660; y++) {
    for (let x = 280; x < 385; x++) {
      const srcX = 400 + (400 - x) * 0.9;
      const srcY = y + 180;
      if (srcX >= 0 && srcX < targetW && srcY >= 0 && srcY < targetH) {
        const srcIdx = (Math.floor(srcY) * targetW + Math.floor(srcX)) * 4;
        if (buffer[srcIdx + 3] > 40) {
          const tgtIdx = (y * targetW + x) * 4;
          if (buffer[tgtIdx + 3] < 100) { // only fill empty space
            buffer[tgtIdx] = buffer[srcIdx];
            buffer[tgtIdx + 1] = buffer[srcIdx + 1];
            buffer[tgtIdx + 2] = buffer[srcIdx + 2];
            buffer[tgtIdx + 3] = buffer[srcIdx + 3];
          }
        }
      }
    }
  }

  // Save clean idle shotgun
  await sharp(buffer, { raw: { width: targetW, height: targetH, channels: 4 } })
    .png()
    .toFile(path.join(publicDir, 'shotgun-fps-idle.png'));
  console.log('Saved shotgun-fps-idle.png');

  // Also create firing frame (recoil shift + slight flash glow on barrels)
  const fireBuffer = Buffer.alloc(targetW * targetH * 4, 0);
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcIdx = (y * targetW + x) * 4;
      if (buffer[srcIdx + 3] < 15) continue;

      const fy = Math.min(targetH - 1, y + 14); // 14px recoil drop
      const tgtIdx = (fy * targetW + x) * 4;

      // Slight muzzle heat flash highlight on upper barrel
      let r = buffer[srcIdx];
      let g = buffer[srcIdx + 1];
      let b = buffer[srcIdx + 2];
      if (y < 250) {
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 25);
      }

      fireBuffer[tgtIdx] = r;
      fireBuffer[tgtIdx + 1] = g;
      fireBuffer[tgtIdx + 2] = b;
      fireBuffer[tgtIdx + 3] = buffer[srcIdx + 3];
    }
  }

  await sharp(fireBuffer, { raw: { width: targetW, height: targetH, channels: 4 } })
    .png()
    .toFile(path.join(publicDir, 'shotgun-fps-fire.png'));
  console.log('Saved shotgun-fps-fire.png');

  // Overwrite shotgun-fps.png with the clean centered version
  fs.copyFileSync(path.join(publicDir, 'shotgun-fps-idle.png'), path.join(publicDir, 'shotgun-fps.png'));
}

async function buildGooseDyingFrames() {
  const hitSource = path.join(publicDir, 'goose-hit-v2.png');
  if (!fs.existsSync(hitSource)) return;

  // Frame 1: Hit frame (stunned)
  await sharp(hitSource)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'goose-hit-frame1.png'));

  // Frame 2: Falling tumble 1 (rotated 45 deg with tilt)
  await sharp(hitSource)
    .rotate(45, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'goose-falling-frame1.png'));

  // Frame 3: Falling tumble 2 (rotated 110 deg)
  await sharp(hitSource)
    .rotate(110, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'goose-falling-frame2.png'));

  // Create colored versions for Blue and Red geese
  for (const type of ['blue', 'red']) {
    const hue = type === 'blue' ? 200 : 350;
    const sat = type === 'blue' ? 1.5 : 1.8;

    await sharp(path.join(publicDir, 'goose-hit-frame1.png'))
      .modulate({ hue, saturation: sat })
      .png()
      .toFile(path.join(publicDir, `goose-${type}-hit.png`));

    await sharp(path.join(publicDir, 'goose-falling-frame1.png'))
      .modulate({ hue, saturation: sat })
      .png()
      .toFile(path.join(publicDir, `goose-${type}-falling-1.png`));

    await sharp(path.join(publicDir, 'goose-falling-frame2.png'))
      .modulate({ hue, saturation: sat })
      .png()
      .toFile(path.join(publicDir, `goose-${type}-falling-2.png`));
  }

  console.log('All goose dying and falling frame animations generated!');
}

async function run() {
  await buildCleanShotgun();
  await buildGooseDyingFrames();
}

run().catch(console.error);
