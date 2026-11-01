// =========================================================================
// GOOGLE DRIVE LIVE LOGO SYNC CONFIGURATION
// =========================================================================
// Syncs with Google Drive Folder:
// https://drive.google.com/drive/folders/1IExTUbcA2Lf_OXsJ5yLqfTqb6jJGvc-f?usp=sharing
window.GOOGLE_DRIVE_LOGOS_API_URL = "/api/drive-logos";

// All logos currently in the folder (including new ones like HofN and MA-Accessories)
window.DEFAULT_MARQUEE_LOGOS = [
  "1NGhrBt132bTNGsvxNsMifvttasr02TsO",
  "1ZaAfK9dLd65SJj3j-mSb9GzUvUXV9O99",
  "1W5xT8vYlKGSiS-V35x5arGn8uJb1vjx3",
  "1IqDf4_mX-Pc4fjLM04CdAzfpqIyjQxyW",
  "1yfUsmZK00MS4Kj_HySheR0pKgaJQqt2r",
  "1JJ-1hiEPfBiY2KeHI2G0BqJTadYfQLB5",
  "1QqWfCLZq8TL_sr9ZB5CpYczXC-XgZWIi",
  "1iw96VznhNijHA35yXYd0cqR5tVBJ6-Xw"
];

// Resolves a Google Drive ID or direct URL to an embeddable image src
window.getLogoImageUrl = function(idOrUrl) {
  if (!idOrUrl) return "";
  if (idOrUrl.startsWith("http://") || idOrUrl.startsWith("https://")) {
    const match = idOrUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || idOrUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return "https://lh3.googleusercontent.com/d/" + match[1];
    }
    return idOrUrl;
  }
  return "https://lh3.googleusercontent.com/d/" + idOrUrl;
};

// Fetches the latest logos from the live sync API or falls back gracefully
window.loadMarqueeLogos = async function() {
  const apiUrl = window.GOOGLE_DRIVE_LOGOS_API_URL;
  if (apiUrl && apiUrl.trim() !== "") {
    try {
      const response = await fetch(apiUrl.trim());
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const ids = data.map(item => (typeof item === "string" ? item : item.id || item.url)).filter(Boolean);
          if (ids.length > 0) {
            try {
              localStorage.setItem("cached_marquee_logos", JSON.stringify(ids));
            } catch (e) {}
            return ids;
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch live Google Drive logos, using fallback:", err);
    }
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem("cached_marquee_logos");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  return window.DEFAULT_MARQUEE_LOGOS;
};
