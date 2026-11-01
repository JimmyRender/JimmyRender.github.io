window.NEW_DRIVE_PROJECTS = ["https://drive.google.com/drive/folders/1iHSYQvGOMRsNSfwPVHgRjkvj2SnsVQkn?usp=sharing"];

window.CUSTOM_PROJECTS = [];
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

    let projectObj = null;

    try {
      const res = await fetch(`/api/drive-project?folder=${encodeURIComponent(folderId)}`);
      if (res.ok) {
        projectObj = await res.json();
      }
    } catch (e) {
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

      try {
        localStorage.setItem(`cached_drive_proj_${folderId}`, JSON.stringify(projectObj));
      } catch (e) {}

      results.push(projectObj);
    }
  }

  return results;
};
