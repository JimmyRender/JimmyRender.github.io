import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Connect } from "vite";

const LOGOS_FOLDER_ID = "1IExTUbcA2Lf_OXsJ5yLqfTqb6jJGvc-f";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const IMAGE_EXT = /\.(png|jpe?g|webp|svg)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi)$/i;
const DRIVE_ID = /^[a-zA-Z0-9_-]{25,}$/;

function readLogosConfig() {
  const source = fs.readFileSync(path.resolve(__dirname, "logos-config.js"), "utf8");
  const list = source.match(/DEFAULT_MARQUEE_LOGOS\s*=\s*(\[[\s\S]*?\]);/);
  const overrides = source.match(/LOCAL_LOGO_OVERRIDES\s*=\s*(\{[\s\S]*?\});/);
  return {
    defaults: list ? (JSON.parse(list[1].replace(/,\s*\]/, "]")) as string[]) : [],
    overrides: overrides ? (JSON.parse(overrides[1].replace(/,\s*\}/, "}")) as Record<string, string>) : {},
  };
}

const { defaults: DEFAULT_LOGOS, overrides: LOGO_OVERRIDES } = readLogosConfig();
let cachedLogos: string[] = DEFAULT_LOGOS;
let lastFetchTime = 0;

async function fetchDriveHtml(folderId: string) {
  const res = await fetch(`https://drive.google.com/drive/folders/${folderId}?usp=sharing`, {
    headers: { "User-Agent": USER_AGENT },
  });
  return res.ok ? res.text() : null;
}

async function fetchDriveLogos(): Promise<string[]> {
  if (Date.now() - lastFetchTime < 15000 && cachedLogos.length > 0) return cachedLogos;
  try {
    const html = await fetchDriveHtml(LOGOS_FOLDER_ID);
    if (!html) return cachedLogos;
    const ids: string[] = [];
    for (const m of html.matchAll(/data-id="([a-zA-Z0-9_-]+)"/g)) {
      const id = m[1];
      if (id === LOGOS_FOLDER_ID || !DRIVE_ID.test(id) || !id.startsWith("1")) continue;
      const mapped = LOGO_OVERRIDES[id] || id;
      if (!ids.includes(mapped)) ids.push(mapped);
    }
    if (ids.length > 0) {
      cachedLogos = ids;
      lastFetchTime = Date.now();
    }
  } catch (err) {
    console.warn("Could not read the Drive logos folder:", err);
  }
  return cachedLogos;
}

async function fetchDriveProject(input: string) {
  const folderId = (input.match(/folders\/([a-zA-Z0-9_-]+)/) || [null, input])[1] || "";
  if (!DRIVE_ID.test(folderId)) return null;
  try {
    const html = await fetchDriveHtml(folderId);
    if (!html) return null;

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s*[-–]\s*Google Drive\s*$/i, "").trim() : "New Project";

    const files: Array<{ id: string; name: string }> = [];
    const regex = /data-id="([a-zA-Z0-9_-]+)"[\s\S]{1,500}?(?:aria-label="([^"]+)"|class="[^"]*">([^<]+\.[a-zA-Z0-9]{3,4}))/g;
    for (const m of html.matchAll(regex)) {
      const id = m[1];
      const name = m[2] || m[3] || "";
      if (id !== folderId && DRIVE_ID.test(id) && id.startsWith("1") && !files.some((f) => f.id === id)) {
        files.push({ id, name });
      }
    }

    const usable = files.filter((f) => !/do not post|only for/i.test(f.name));
    const video = usable.find((f) => VIDEO_EXT.test(f.name));
    const images = usable.filter((f) => !VIDEO_EXT.test(f.name));
    const cover = images.find((f) => /^1(\.[a-z0-9]+)?$/i.test(f.name.trim())) || images[0];

    return {
      title,
      src: cover ? `https://lh3.googleusercontent.com/d/${cover.id}` : "",
      video: video ? `https://drive.google.com/file/d/${video.id}/preview` : "",
      concept: "A full-service CGI production showcasing premium visual design, dynamic framing, and atmospheric detail.",
      gallery: images.filter((f) => f !== cover).map((f) => `https://lh3.googleusercontent.com/d/${f.id}`),
    };
  } catch (err) {
    console.warn("Could not read the Drive project folder:", err);
    return null;
  }
}

function sendJson(res: Parameters<Connect.NextHandleFunction>[1], data: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function registerApi(middlewares: Connect.Server) {
  middlewares.use("/api/drive-logos", async (_req, res) => sendJson(res, await fetchDriveLogos()));
  middlewares.use("/api/drive-project", async (req, res) => {
    const folder = new URL(req.url || "", "http://localhost").searchParams.get("folder") || "";
    sendJson(res, await fetchDriveProject(folder));
  });
}

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) copyRecursive(path.join(src, entry), path.join(dest, entry));
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

export default defineConfig({
  plugins: [
    {
      name: "google-drive-api",
      configureServer(server) {
        registerApi(server.middlewares);
      },
      configurePreviewServer(server) {
        registerApi(server.middlewares);
      },
      closeBundle() {
        const dist = path.resolve(__dirname, "dist");
        if (!fs.existsSync(dist)) return;
        for (const file of ["logos-config.js", "projects-config.js", "pricing-config.js", "CNAME"]) {
          copyRecursive(path.resolve(__dirname, file), path.join(dist, file));
        }
        copyRecursive(path.resolve(__dirname, "assets"), path.join(dist, "assets"));
        for (const file of fs.readdirSync(__dirname)) {
          if (file.endsWith(".glb")) copyRecursive(path.resolve(__dirname, file), path.join(dist, file));
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: process.env.DISABLE_HMR !== "true",
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },
  preview: {
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        desktop: path.resolve(__dirname, "desktop.html"),
        mobile: path.resolve(__dirname, "mobile.html"),
        featured: path.resolve(__dirname, "featured.html"),
        notFound: path.resolve(__dirname, "404.html"),
      },
    },
  },
});
