// Add a Google Drive folder link here, then run: npm run sync-drive
// Folder name = project title, photo named "1" = cover, video file = project video, other photos = gallery.
window.NEW_DRIVE_PROJECTS = [
  "https://drive.google.com/drive/folders/1iHSYQvGOMRsNSfwPVHgRjkvj2SnsVQkn?usp=sharing"
];

window.DRIVE_PROJECT_REGISTRY = {
  "1iHSYQvGOMRsNSfwPVHgRjkvj2SnsVQkn": {
    "title": "MA-Accessories",
    "src": "https://lh3.googleusercontent.com/d/1kY6kBKI2yhW5Jn-jeZ7B0SGauwbIzREq",
    "video": "https://drive.google.com/file/d/1xxHtnEodeWzg8qrUY-NTozKTKeuU6wex/preview",
    "concept": "MA-Accessories — Crafted with purposeful aesthetic direction, detailed CGI composition, and cinematic refinement.",
    "gallery": [
      "https://lh3.googleusercontent.com/d/1CuGo1eqYCA8Gj20npMjBaBWEv2G4LLUb",
      "https://lh3.googleusercontent.com/d/1mo0N4ezH0F5fSzF_j6DAm3tqXLgyPSRT",
      "https://lh3.googleusercontent.com/d/16Y-jLT-d5x5aB9TcBvBSAaTCEgwsqP3t"
    ]
  }
};

// Optional overrides: { folder: "<drive folder link>", title, video, concept }
window.CUSTOM_PROJECTS = [];

window.loadNewProjects = async function () {
  const custom = window.CUSTOM_PROJECTS || [];
  const folders = (window.NEW_DRIVE_PROJECTS || []).concat(
    custom.map((p) => (typeof p === "string" ? p : p.folder)).filter(Boolean)
  );
  if (folders.length === 0) return [];

  const staticHost = typeof window.isStaticHost === "function" ? window.isStaticHost() : false;
  const results = [];

  for (const folderInput of folders) {
    const customConfig = custom.find((p) => p && p.folder === folderInput) || {};
    const match = folderInput.match(/folders\/([a-zA-Z0-9_-]+)/) || [null, folderInput];
    const folderId = match[1];
    if (!folderId) continue;

    let projectObj = null;

    if (window.DRIVE_PROJECT_REGISTRY && window.DRIVE_PROJECT_REGISTRY[folderId]) {
      projectObj = JSON.parse(JSON.stringify(window.DRIVE_PROJECT_REGISTRY[folderId]));
    }

    if (!projectObj && !staticHost) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`api/drive-project?folder=${encodeURIComponent(folderId)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) projectObj = await res.json();
      } catch (e) {}
    }

    if (!projectObj) {
      try {
        const cached = localStorage.getItem(`cached_drive_proj_${folderId}`);
        if (cached) projectObj = JSON.parse(cached);
      } catch (e) {}
    }

    if (projectObj) {
      if (customConfig.title) projectObj.title = customConfig.title;
      if (customConfig.video) projectObj.video = customConfig.video;
      if (customConfig.concept) projectObj.concept = customConfig.concept;
      delete projectObj.hearts;
      try {
        localStorage.setItem(`cached_drive_proj_${folderId}`, JSON.stringify(projectObj));
      } catch (e) {}
      results.push(projectObj);
    }
  }

  return results;
};
