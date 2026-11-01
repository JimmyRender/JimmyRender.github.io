// =========================================================================
// GOOGLE DRIVE AUTO-SYNC SCRIPT FOR GITHUB PAGES & DEPLOYMENT
// =========================================================================
// Run this anytime you add new Google Drive links in projects-config.js or logos-config.js:
//   npm run sync-drive
//
// It automatically fetches the folder names, photos, and videos from Google Drive
// and updates the static registry so everything works seamlessly on GitHub Pages!

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fetchDriveHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function parseDriveFolder(folderId) {
  const url = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  const data = await fetchDriveHtml(url);

  let title = 'New Project';
  const titleMatch = data.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) {
    title = titleMatch[1].replace(/– Google\s*Drive.*/, '').trim();
  }

  const items = [];
  const regex = /data-id=\"([a-zA-Z0-9_-]{25,})\".*?data-tooltip=\"([^\"]+)\"/g;
  let match;
  while ((match = regex.exec(data)) !== null) {
    items.push({ id: match[1], name: match[2] });
  }

  let coverId = null;
  let videoUrl = '';
  const gallery = [];

  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    if (nameLower.includes('do not post') || nameLower.includes('only for')) {
      continue;
    }
    if (nameLower.startsWith('1.') || nameLower.includes('cover') || nameLower.includes('thumb')) {
      coverId = item.id;
    } else if (nameLower.includes('.mp4') || nameLower.includes('video')) {
      videoUrl = `https://drive.google.com/file/d/${item.id}/preview`;
    } else {
      gallery.push(`https://lh3.googleusercontent.com/d/${item.id}`);
    }
  }

  if (!coverId && gallery.length > 0) {
    coverId = gallery[0].replace('https://lh3.googleusercontent.com/d/', '');
  }

  return {
    title: title || 'New Project',
    src: coverId ? `https://lh3.googleusercontent.com/d/${coverId}` : '',
    video: videoUrl,
    concept: `${title} — Crafted with purposeful aesthetic direction, detailed CGI composition, and cinematic refinement.`,
    gallery,
    hearts: '4.9K',
  };
}

async function run() {
  console.log('🔄 Syncing Google Drive projects for GitHub Pages...');

  const configPath = path.join(__dirname, 'projects-config.js');
  let configContent = fs.readFileSync(configPath, 'utf8');

  // Extract folder URLs from uncommented NEW_DRIVE_PROJECTS declaration
  const match = configContent.match(/(?:^|\n)\s*window\.NEW_DRIVE_PROJECTS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) {
    console.log('No NEW_DRIVE_PROJECTS array found in projects-config.js');
    return;
  }

  const rawArray = match[1];
  const urlMatches = rawArray.match(/https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]{25,})/g) || [];

  if (urlMatches.length === 0) {
    console.log('No valid Google Drive folder URLs found in window.NEW_DRIVE_PROJECTS.');
    return;
  }

  // Parse existing registry or initialize
  const registryRegex = /window\.DRIVE_PROJECT_REGISTRY\s*=\s*(\{[\s\S]*?\n\};)/;
  const regMatch = configContent.match(registryRegex);
  let registry = {};

  for (const folderUrl of urlMatches) {
    const idMatch = folderUrl.match(/folders\/([a-zA-Z0-9_-]{25,})/);
    if (!idMatch) continue;
    const folderId = idMatch[1];

    console.log(`📡 Fetching Drive folder: ${folderId}...`);
    try {
      const parsed = await parseDriveFolder(folderId);
      registry[folderId] = parsed;
      console.log(`✅ Synced "${parsed.title}":`);
      console.log(`   - Cover: ${parsed.src ? 'Yes' : 'None'}`);
      console.log(`   - Video: ${parsed.video ? 'Yes' : 'None'}`);
      console.log(`   - Gallery: ${parsed.gallery.length} images`);
    } catch (err) {
      console.error(`❌ Error fetching folder ${folderId}:`, err.message);
    }
  }

  const newRegistryBlock = `window.DRIVE_PROJECT_REGISTRY = ${JSON.stringify(registry, null, 2)};`;

  if (regMatch) {
    configContent = configContent.replace(registryRegex, newRegistryBlock);
  } else {
    // Insert after NEW_DRIVE_PROJECTS
    configContent = configContent.replace(
      match[0],
      `${match[0]}\n\n// Offline & static-hosting fallback registry for known folders\n${newRegistryBlock}`
    );
  }

  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('🎉 projects-config.js updated successfully! You can now commit and push to GitHub.');
}

run().catch(console.error);
