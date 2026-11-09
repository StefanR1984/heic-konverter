'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3f6bff"/>
      <stop offset="1" stop-color="#22c3e6"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eaf1ff"/>
    </linearGradient>
    <linearGradient id="hill1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6f9bff"/>
      <stop offset="1" stop-color="#4f7df0"/>
    </linearGradient>
    <linearGradient id="hill2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4dd6ee"/>
      <stop offset="1" stop-color="#22c3e6"/>
    </linearGradient>
    <clipPath id="cardClip">
      <rect x="238" y="214" width="548" height="596" rx="64"/>
    </clipPath>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#0b1b3a" flood-opacity="0.35"/>
    </filter>
    <filter id="badgeShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#04122e" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="1024" height="1024" rx="228" fill="url(#bg)"/>
  <circle cx="812" cy="188" r="180" fill="#ffffff" opacity="0.1"/>
  <circle cx="168" cy="872" r="240" fill="#001a3a" opacity="0.1"/>

  <g filter="url(#shadow)">
    <rect x="238" y="214" width="548" height="596" rx="64" fill="url(#card)"/>
    <g clip-path="url(#cardClip)">
      <circle cx="398" cy="384" r="54" fill="#5f8bff"/>
      <path d="M238 772 L412 524 Q428 502 444 524 L556 676 L620 592 Q636 570 652 592 L786 772 Z" fill="url(#hill1)"/>
      <path d="M238 800 L404 650 Q420 630 436 650 L544 768 L618 684 Q634 664 650 684 L786 806 L786 810 L238 810 Z" fill="url(#hill2)" opacity="0.92"/>
    </g>
    <rect x="238" y="214" width="548" height="596" rx="64" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="4"/>
  </g>

  <g filter="url(#badgeShadow)">
    <circle cx="766" cy="754" r="126" fill="#ffffff"/>
    <path d="M704 754 H 812" fill="none" stroke="#4f7df0" stroke-width="26" stroke-linecap="round"/>
    <path d="M770 712 L 812 754 L 770 796" fill="none" stroke="#4f7df0" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

(async () => {
  const buildDir = path.join(__dirname, '..', 'build');
  await fs.mkdir(buildDir, { recursive: true });
  const target = path.join(buildDir, 'icon.png');
  await sharp(Buffer.from(SVG)).png().toFile(target);
  console.log(`Icon geschrieben: ${target}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
