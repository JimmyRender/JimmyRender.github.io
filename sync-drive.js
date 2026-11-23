// Updates DRIVE_PROJECT_REGISTRY in projects-config.js from the Drive folders listed in NEW_DRIVE_PROJECTS.
// Usage: npm run sync-drive

import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "projects-config.js");
const IMAGE_EXT = /\.(png|jpe?g|webp|svg)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi)$/i;

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

async function parseDriveFolder(folderId) {
  const html = await fetchHtml(`https://drive.google.com/drive/folders/${folderId}?usp=sharing`);

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s*[-–]\s*Google Drive\s*$/i, "").trim() : "New Project";

  const files = [];
  const regex = /data-id="([a-zA-Z0-9_-]{25,})"[\s\S]{0,600}?data-tooltip="([^"]+)"/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (m[1] !== folderId && !files.some((f) => f.id === m[1])) {
      files.push({ id: m[1], name: m[2] });
    }
  }

  const usable = files.filter((f) => !/do not post|only for/i.test(f.name));
  const video = usable.find((f) => VIDEO_EXT.test(f.name));
  const images = usable.filter((f) => !VIDEO_EXT.test(f.name));
  const cover = images.find((f) => /^1(\.[a-z0-9]+)?$/i.test(f.name.trim())) || images[0];

  return {
    title: title || "New Project",
    src: cover ? `https://lh3.googleusercontent.com/d/${cover.id}` : "",
    video: video ? `https://drive.google.com/file/d/${video.id}/preview` : "",
    concept: `${title} — Crafted with purposeful aesthetic direction, detailed CGI composition, and cinematic refinement.`,
    gallery: images.filter((f) => f !== cover).map((f) => `https://lh3.googleusercontent.com/d/${f.id}`),
  };
}

async function run() {
  let config = fs.readFileSync(CONFIG_PATH, "utf8");

  const listMatch = config.match(/window\.NEW_DRIVE_PROJECTS\s*=\s*\[([\s\S]*?)\];/);
  if (!listMatch) {
    console.log("No NEW_DRIVE_PROJECTS array found in projects-config.js");
    return;
  }

  const ids = [...listMatch[1].matchAll(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]{25,})/g)].map((x) => x[1]);
  if (ids.length === 0) {
    console.log("No Google Drive folder links found in NEW_DRIVE_PROJECTS.");
    return;
  }

  const registryRegex = /window\.DRIVE_PROJECT_REGISTRY\s*=\s*(\{[\s\S]*?\n\});/;
  const regMatch = config.match(registryRegex);
  let registry = {};
  if (regMatch) {
    try {
      registry = JSON.parse(regMatch[1]);
    } catch (e) {
      console.warn("Could not read the existing registry, it will be rebuilt.");
    }
  }

  const next = {};
  for (const id of ids) {
    try {
      const project = await parseDriveFolder(id);
      next[id] = project;
      console.log(`Synced "${project.title}": cover ${project.src ? "yes" : "no"}, video ${project.video ? "yes" : "no"}, ${project.gallery.length} gallery images`);
    } catch (err) {
      console.error(`Failed to fetch folder ${id}: ${err.message}. Keeping the previous entry.`);
      if (registry[id]) next[id] = registry[id];
    }
  }

  const block = `window.DRIVE_PROJECT_REGISTRY = ${JSON.stringify(next, null, 2)};`;
  config = regMatch
    ? config.replace(registryRegex, block)
    : config.replace(listMatch[0], `${listMatch[0]}\n\n${block}`);

  fs.writeFileSync(CONFIG_PATH, config, "utf8");
  console.log("projects-config.js updated.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
