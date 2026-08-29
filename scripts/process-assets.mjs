import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kochi\\.gemini\\antigravity-ide\\brain\\247b5770-07f9-46b6-9ef3-9190ed3fe5df';
const publicImagesDir = 'c:\\Users\\kochi\\OneDrive\\Desktop\\(01)-DEVELOPMENT\\06_PRACTICE\\web-game-shooter\\goosehunter\\public\\images';

async function removeMagentaChroma(inputPath, outputPath, options = {}) {
  const { trim = true, pad = 0 } = options;
  const image = sharp(inputPath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  // Magenta is R ~ 255, G ~ 0, B ~ 255
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = Math.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2);
    
    // Pixel is magenta / purple / pink background
    if (dist < 140 || (r > 160 && b > 160 && g < 110) || (r > 200 && b > 200 && g < 140)) {
      data[i + 3] = 0; // Transparent
    }
  }

  let processed = sharp(data, {
    raw: {
      width,
      height,
      channels
    }
  });

  if (trim) {
    try {
      processed = processed.trim();
    } catch (e) {
      console.log('Trim skipped for', outputPath);
    }
  }

  await processed.png().toFile(outputPath);
  console.log(`Saved transparent sprite: ${outputPath}`);
}

async function copyBackground(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(1280, 720, { fit: 'cover' })
    .png({ quality: 95 })
    .toFile(outputPath);
  console.log(`Saved background: ${outputPath}`);
}

async function run() {
  const files = fs.readdirSync(brainDir);
  console.log('Files in brain dir:', files);

  const bgDay = files.find(f => f.startsWith('arcade_hunting_background_') && f.endsWith('.jpg'));
  const bgDusk = files.find(f => f.startsWith('arcade_hunting_background_dusk_') && f.endsWith('.jpg'));
  const bgSnow = files.find(f => f.startsWith('arcade_hunting_background_snow_') && f.endsWith('.jpg'));
  const shotgun = files.find(f => f.startsWith('arcade_shotgun_fps_') && f.endsWith('.jpg'));
  const flashUp = files.find(f => f.startsWith('shotgun_muzzle_flash_up_') && f.endsWith('.jpg'));
  const flash = files.find(f => f.startsWith('shotgun_muzzle_flash_1') && f.endsWith('.jpg'));
  const shell = files.find(f => f.startsWith('shotgun_shell_casing_') && f.endsWith('.jpg'));
  const feather = files.find(f => f.startsWith('flying_feather_') && f.endsWith('.jpg'));
  const gooseBlack1 = files.find(f => f.startsWith('goose_black_flying_') && f.endsWith('.jpg'));
  const gooseBlack2 = files.find(f => f.startsWith('goose_black_flap_') && f.endsWith('.jpg'));
  const gooseBlue = files.find(f => f.startsWith('goose_blue_flying_') && f.endsWith('.jpg'));
  const gooseRed = files.find(f => f.startsWith('goose_red_flying_') && f.endsWith('.jpg'));
  const gooseHit = files.find(f => f.startsWith('goose_hit_sprite_') && f.endsWith('.jpg'));

  if (bgDay) {
    await copyBackground(path.join(brainDir, bgDay), path.join(publicImagesDir, 'arcade-bg-marsh-day.png'));
  }
  if (bgDusk) {
    await copyBackground(path.join(brainDir, bgDusk), path.join(publicImagesDir, 'arcade-bg-marsh-dusk.png'));
  }
  if (bgSnow) {
    await copyBackground(path.join(brainDir, bgSnow), path.join(publicImagesDir, 'arcade-bg-marsh-snow.png'));
  }

  if (shotgun) {
    await removeMagentaChroma(path.join(brainDir, shotgun), path.join(publicImagesDir, 'shotgun-fps.png'), { trim: false });
  }

  if (flashUp) {
    await removeMagentaChroma(path.join(brainDir, flashUp), path.join(publicImagesDir, 'shotgun-flash.png'), { trim: true });
  } else if (flash) {
    await removeMagentaChroma(path.join(brainDir, flash), path.join(publicImagesDir, 'shotgun-flash.png'), { trim: true });
  }

  if (shell) {
    await removeMagentaChroma(path.join(brainDir, shell), path.join(publicImagesDir, 'shotgun-shell.png'), { trim: true });
  }

  if (feather) {
    await removeMagentaChroma(path.join(brainDir, feather), path.join(publicImagesDir, 'goose-feather.png'), { trim: true });
  }

  if (gooseBlack1) {
    await removeMagentaChroma(path.join(brainDir, gooseBlack1), path.join(publicImagesDir, 'goose-black-v2-1.png'));
  }
  if (gooseBlack2) {
    await removeMagentaChroma(path.join(brainDir, gooseBlack2), path.join(publicImagesDir, 'goose-black-v2-2.png'));
  }
  if (gooseBlue) {
    await removeMagentaChroma(path.join(brainDir, gooseBlue), path.join(publicImagesDir, 'goose-blue-v2.png'));
  }
  if (gooseRed) {
    await removeMagentaChroma(path.join(brainDir, gooseRed), path.join(publicImagesDir, 'goose-red-v2.png'));
  }
  if (gooseHit) {
    await removeMagentaChroma(path.join(brainDir, gooseHit), path.join(publicImagesDir, 'goose-hit-v2.png'));
  }

  console.log('All asset processing complete!');
}

run().catch(console.error);
