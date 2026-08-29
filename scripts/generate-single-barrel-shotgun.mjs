import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = 'c:\\Users\\kochi\\OneDrive\\Desktop\\(01)-DEVELOPMENT\\06_PRACTICE\\web-game-shooter\\goosehunter\\public\\images';

function createSingleBarrelShotgunSVG(isFiring = false) {
  const recoilOffset = isFiring ? 16 : 0;

  // 600 x 700 viewport, centered at X=300
  return `<svg width="600" height="700" viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
    <defs>
      <!-- Steel Barrel Gradients -->
      <linearGradient id="barrelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="25%" stop-color="#475569" />
        <stop offset="50%" stop-color="#94a3b8" />
        <stop offset="75%" stop-color="#475569" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>

      <linearGradient id="barrelRibGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="50%" stop-color="#cbd5e1" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>

      <!-- Polished Walnut Wood Gradient -->
      <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#451a03" />
        <stop offset="20%" stop-color="#78350f" />
        <stop offset="50%" stop-color="#b45309" />
        <stop offset="75%" stop-color="#78350f" />
        <stop offset="100%" stop-color="#270e02" />
      </linearGradient>

      <linearGradient id="woodHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#78350f" />
        <stop offset="50%" stop-color="#d97706" />
        <stop offset="100%" stop-color="#451a03" />
      </linearGradient>

      <!-- Receiver Metal Gradient -->
      <linearGradient id="receiverGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#18181b" />
        <stop offset="25%" stop-color="#3f3f46" />
        <stop offset="50%" stop-color="#71717a" />
        <stop offset="75%" stop-color="#3f3f46" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>

      <!-- Glove Leather Gradient -->
      <linearGradient id="gloveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#18181b" />
        <stop offset="40%" stop-color="#27272a" />
        <stop offset="70%" stop-color="#3f3f46" />
        <stop offset="100%" stop-color="#09090b" />
      </linearGradient>

      <!-- Skin Tone Gradient -->
      <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#b45309" />
        <stop offset="40%" stop-color="#d97706" />
        <stop offset="70%" stop-color="#fcd34d" />
        <stop offset="100%" stop-color="#92400e" />
      </linearGradient>

      <filter id="pixelate" x="0" y="0">
        <feFlood flood-color="#000" result="bg" />
      </filter>
    </defs>

    <g transform="translate(0, ${recoilOffset})">
      <!-- 1. MAIN STOCK (Walnut wood extending down to shoulder/bottom center) -->
      <!-- Stock base contour -->
      <path d="M 240 460 L 360 460 L 400 700 L 200 700 Z" fill="url(#woodGrad)" stroke="#1c0901" stroke-width="4" />
      
      <!-- Woodgrain subtle stripes -->
      <path d="M 265 480 Q 290 580 250 690" stroke="#331203" stroke-width="3" fill="none" opacity="0.6" />
      <path d="M 335 480 Q 310 580 350 690" stroke="#331203" stroke-width="3" fill="none" opacity="0.6" />
      <path d="M 300 470 Q 300 580 300 700" stroke="#d97706" stroke-width="2" fill="none" opacity="0.4" />

      <!-- 2. TRIGGER GUARD & SINGLE TRIGGER -->
      <!-- Guard oval -->
      <path d="M 285 460 C 285 510, 315 510, 315 460 Z" fill="#09090b" stroke="#3f3f46" stroke-width="4" />
      <!-- Inside hole -->
      <path d="M 292 460 C 292 495, 308 495, 308 460 Z" fill="#270e02" />
      <!-- Single silver trigger -->
      <path d="M 298 460 Q 302 480 295 488 L 302 488 Q 307 478 304 460 Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5" />

      <!-- 3. STEEL RECEIVER / ACTION -->
      <rect x="252" y="320" width="96" height="145" rx="6" fill="url(#receiverGrad)" stroke="#09090b" stroke-width="4" />
      <!-- Receiver bevels and bolts -->
      <rect x="260" y="330" width="80" height="40" fill="#27272a" stroke="#18181b" stroke-width="2" />
      <!-- Bolt ejection port (right side) -->
      <rect x="315" y="335" width="22" height="28" rx="2" fill="#09090b" stroke="#52525b" stroke-width="2" />
      <circle cx="326" cy="349" r="4" fill="#ca8a04" />
      <!-- Receiver screws & pins -->
      <circle cx="266" cy="390" r="3" fill="#09090b" stroke="#71717a" stroke-width="1.5" />
      <circle cx="266" cy="430" r="3.5" fill="#09090b" stroke="#71717a" stroke-width="1.5" />
      <circle cx="334" cy="430" r="3.5" fill="#09090b" stroke="#71717a" stroke-width="1.5" />

      <!-- 4. WOODEN FOREND (Grip under the barrel) -->
      <path d="M 268 210 L 332 210 L 344 325 L 256 325 Z" fill="url(#woodHighlight)" stroke="#1c0901" stroke-width="4" />
      <!-- Checkering diamond pattern lines on forend -->
      <line x1="272" y1="230" x2="328" y2="310" stroke="#451a03" stroke-width="2" stroke-dasharray="3,3" />
      <line x1="282" y1="220" x2="338" y2="300" stroke="#451a03" stroke-width="2" stroke-dasharray="3,3" />
      <line x1="328" y1="230" x2="272" y2="310" stroke="#451a03" stroke-width="2" stroke-dasharray="3,3" />
      <line x1="318" y1="220" x2="262" y2="300" stroke="#451a03" stroke-width="2" stroke-dasharray="3,3" />

      <!-- 5. SINGLE STEEL BARREL (Tapered from receiver to muzzle tip) -->
      <!-- Main barrel tube -->
      <polygon points="286,45 314,45 324,220 276,220" fill="url(#barrelGrad)" stroke="#09090b" stroke-width="4" />
      
      <!-- Top Ventilated Sight Rib -->
      <polygon points="296,40 304,40 306,220 294,220" fill="url(#barrelRibGrad)" stroke="#0f172a" stroke-width="2" />
      <!-- Ventilation cutouts on rib -->
      <line x1="295" y1="65" x2="305" y2="65" stroke="#09090b" stroke-width="3" />
      <line x1="295" y1="95" x2="305" y2="95" stroke="#09090b" stroke-width="3" />
      <line x1="295" y1="125" x2="305" y2="125" stroke="#09090b" stroke-width="3" />
      <line x1="295" y1="155" x2="305" y2="155" stroke="#09090b" stroke-width="3" />
      <line x1="295" y1="185" x2="305" y2="185" stroke="#09090b" stroke-width="3" />

      <!-- Muzzle Crown / Bore Opening (at tip X=300, Y=40) -->
      <!-- Outer muzzle ring -->
      <ellipse cx="300" cy="44" rx="14" ry="7" fill="#475569" stroke="#09090b" stroke-width="3" />
      <!-- Dark deep barrel bore hole -->
      <ellipse cx="300" cy="44" rx="9" ry="4.5" fill="#020617" stroke="#1e293b" stroke-width="1.5" />
      <!-- Brass Bead Front Sight -->
      <circle cx="300" cy="38" r="3" fill="#facc15" stroke="#78350f" stroke-width="1" />

      <!-- 6. SHOOTER'S HANDS (FPS Perspective) -->
      
      <!-- LEFT HAND (Gripping the wooden forend from below/left) -->
      <g>
        <!-- Forearm / Wrist -->
        <path d="M 120 700 L 220 480 L 265 490 L 190 700 Z" fill="url(#gloveGrad)" stroke="#09090b" stroke-width="4" />
        <!-- Glove strap -->
        <rect x="200" y="520" width="45" height="12" rx="3" fill="#3f3f46" stroke="#18181b" stroke-width="2" />
        <!-- Thumb over side of forend -->
        <path d="M 262 260 C 255 245, 275 240, 282 255 C 285 265, 275 275, 264 275 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="3" />
        <!-- Fingers curling under forend -->
        <!-- Index finger -->
        <path d="M 252 280 C 240 270, 260 260, 272 272 C 280 280, 265 292, 252 285 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Middle finger -->
        <path d="M 248 300 C 236 290, 256 280, 268 292 C 276 300, 261 312, 248 305 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Ring finger -->
        <path d="M 244 320 C 232 310, 252 300, 264 312 C 272 320, 257 332, 244 325 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Pinky -->
        <path d="M 240 340 C 228 330, 248 320, 260 332 C 268 340, 253 352, 240 345 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Glove palm -->
        <path d="M 225 310 Q 255 350 240 380 L 210 360 Z" fill="url(#gloveGrad)" stroke="#09090b" stroke-width="3" />
      </g>

      <!-- RIGHT HAND (Gripping stock grip & trigger from right) -->
      <g>
        <!-- Arm / Wrist extending from bottom right -->
        <path d="M 480 700 L 375 490 L 335 500 L 410 700 Z" fill="url(#gloveGrad)" stroke="#09090b" stroke-width="4" />
        <!-- Glove strap -->
        <rect x="355" y="530" width="45" height="12" rx="3" fill="#3f3f46" stroke="#18181b" stroke-width="2" />
        <!-- Index Finger (on the trigger inside guard!) -->
        <path d="M 325 450 Q 302 460 302 472 Q 312 476 328 462 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Middle Finger (around grip) -->
        <path d="M 335 480 Q 305 488 305 502 Q 320 508 340 495 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Ring Finger -->
        <path d="M 342 505 Q 315 515 315 528 Q 328 534 348 520 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Pinky Finger -->
        <path d="M 350 530 Q 325 540 325 552 Q 338 558 356 545 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
        <!-- Thumb wrapping behind grip -->
        <path d="M 340 435 Q 365 440 360 460 Q 345 465 335 450 Z" fill="url(#skinGrad)" stroke="#18181b" stroke-width="2.5" />
      </g>
    </g>

    ${isFiring ? `
      <!-- Firing Muzzle Heat Blast Reflection on Barrel -->
      <polygon points="280,45 320,45 310,140 290,140" fill="rgba(255, 230, 100, 0.45)" />
      <circle cx="300" cy="40" r="18" fill="rgba(255, 200, 50, 0.6)" />
    ` : ''}
  </svg>`;
}

async function run() {
  const idleSvg = createSingleBarrelShotgunSVG(false);
  const fireSvg = createSingleBarrelShotgunSVG(true);

  // Convert SVGs to crisp high-res pixel-clean PNGs
  await sharp(Buffer.from(idleSvg))
    .png()
    .toFile(path.join(publicDir, 'shotgun-fps-idle.png'));

  await sharp(Buffer.from(fireSvg))
    .png()
    .toFile(path.join(publicDir, 'shotgun-fps-fire.png'));

  // Overwrite default shotgun-fps.png with the new single-barrel shotgun
  fs.copyFileSync(path.join(publicDir, 'shotgun-fps-idle.png'), path.join(publicDir, 'shotgun-fps.png'));

  console.log('Single-barrel shotgun generated successfully with zero artifacts!');
}

run().catch(console.error);
