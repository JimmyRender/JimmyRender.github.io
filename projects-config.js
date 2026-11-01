// =========================================================================
// GOOGLE DRIVE NEW PROJECTS CONFIGURATION
// =========================================================================
// To add any new project from Google Drive, simply paste its folder link below!
// The website will automatically:
//   1. Use the Google Drive Folder Name as the Project Title
//   2. Pick the photo named "1" (1.png, 1.jpg, 1.webp, etc.) as the Cover Photo
//   3. Pick the video file (.mp4, .mov, etc.) or video link as the Project Video
//   4. Add all other photos in the folder to the Project Gallery
//
// NOTE: All your past projects remain completely untouched!
//
// Example:
// window.NEW_DRIVE_PROJECTS = [
//   "https://drive.google.com/drive/folders/1abc...xyz?usp=sharing"
// ];

window.NEW_DRIVE_PROJECTS = [
  "https://drive.google.com/drive/folders/1iHSYQvGOMRsNSfwPVHgRjkvj2SnsVQkn?usp=sharing"
];

// Offline & static-hosting fallback registry for known folders
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
    ],
    "hearts": "4.9K"
  }
};

// Optional: You can also define projects manually if you want to customize titles or descriptions:
// window.CUSTOM_PROJECTS = [
//   {
//     folder: "https://drive.google.com/drive/folders/1abc...xyz",
//     title: "Custom Title (optional)",
//     video: "https://www.youtube.com/embed/... (optional)",
//     concept: "Custom concept description (optional)"
//   }
// ];
window.CUSTOM_PROJECTS = [];

// Helper to fetch and resolve new projects dynamically
window.loadNewProjects = async function() {
  const folders = (window.NEW_DRIVE_PROJECTS || []).concat(
    (window.CUSTOM_PROJECTS || []).map(p => (typeof p === "string" ? p : p.folder)).filter(Boolean)
  );

  if (folders.length === 0) return [];

  const results = [];
  for (let i = 0; i < folders.length; i++) {
    const folderInput = folders[i];
    const customConfig = (window.CUSTOM_PROJECTS || []).find(p => p.folder === folderInput) || {};

    const match = folderInput.match(/folders\/([a-zA-Z0-9_-]+)/) || [null, folderInput];
    const folderId = match[1];
    if (!folderId) continue;

    let projectObj = null;

    // 1. Try fetching from live local server API
    try {
      const res = await fetch(`/api/drive-project?folder=${encodeURIComponent(folderId)}`);
      if (res.ok) {
        projectObj = await res.json();
      }
    } catch (e) {
      // Fallback
    }

    // 2. Check registry for known Drive folders (e.g. static host / GitHub Pages)
    if (!projectObj && window.DRIVE_PROJECT_REGISTRY && window.DRIVE_PROJECT_REGISTRY[folderId]) {
      projectObj = JSON.parse(JSON.stringify(window.DRIVE_PROJECT_REGISTRY[folderId]));
    }

    // 3. Check localStorage cache
    if (!projectObj) {
      try {
        const cached = localStorage.getItem(`cached_drive_proj_${folderId}`);
        if (cached) projectObj = JSON.parse(cached);
      } catch (e) {}
    }

    if (projectObj) {
      // Apply any manual overrides if user provided them
      if (customConfig.title) projectObj.title = customConfig.title;
      if (customConfig.video) projectObj.video = customConfig.video;
      if (customConfig.concept) projectObj.concept = customConfig.concept;

      try {
        localStorage.setItem(`cached_drive_proj_${folderId}`, JSON.stringify(projectObj));
      } catch (e) {}

      results.push(projectObj);
    }
  }

  return results;
};
