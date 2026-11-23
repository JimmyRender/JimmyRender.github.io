window.GOOGLE_DRIVE_LOGOS_API_URL = "api/drive-logos";

window.isStaticHost = function () {
  const host = (window.location && window.location.hostname) || "";
  return host.endsWith("github.io") || host === "jimmyrender.com" || host.endsWith(".jimmyrender.com");
};

window.LOCAL_LOGO_OVERRIDES = {
  "1W5xT8vYlKGSiS-V35x5arGn8uJb1vjx3": "assets/house-of-notes.png",
  "1O64aX13v7zmcGs107AUZQwgnjqnEL-C4": "assets/house-of-notes.png"
};

window.DEFAULT_MARQUEE_LOGOS = [
  "1NGhrBt132bTNGsvxNsMifvttasr02TsO",
  "1ZaAfK9dLd65SJj3j-mSb9GzUvUXV9O99",
  "assets/house-of-notes.png",
  "1IqDf4_mX-Pc4fjLM04CdAzfpqIyjQxyW",
  "1yfUsmZK00MS4Kj_HySheR0pKgaJQqt2r",
  "1JJ-1hiEPfBiY2KeHI2G0BqJTadYfQLB5",
  "1QqWfCLZq8TL_sr9ZB5CpYczXC-XgZWIi",
  "1iw96VznhNijHA35yXYd0cqR5tVBJ6-Xw"
];

window.getLogoImageUrl = function (idOrUrl) {
  if (!idOrUrl) return "";
  const overrides = window.LOCAL_LOGO_OVERRIDES || {};
  if (overrides[idOrUrl]) return overrides[idOrUrl];
  if (
    idOrUrl.startsWith("assets/") ||
    idOrUrl.startsWith("./") ||
    idOrUrl.startsWith("/") ||
    /\.(png|webp|svg|gif)(\?.*)?$/i.test(idOrUrl)
  ) {
    return idOrUrl;
  }
  if (idOrUrl.startsWith("http://") || idOrUrl.startsWith("https://")) {
    const match = idOrUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || idOrUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return overrides[match[1]] || "https://lh3.googleusercontent.com/d/" + match[1];
    }
    return idOrUrl;
  }
  return "https://lh3.googleusercontent.com/d/" + idOrUrl;
};

function normalizeMarqueeLogos(list) {
  const overrides = window.LOCAL_LOGO_OVERRIDES || {};
  return list
    .map((item) => {
      const raw = typeof item === "string" ? item : (item && (item.id || item.url)) || "";
      return overrides[raw] || raw;
    })
    .filter(Boolean);
}

window.loadMarqueeLogos = async function () {
  const cacheKey = "cached_marquee_logos_v2";
  try {
    localStorage.removeItem("cached_marquee_logos");
  } catch (e) {}

  const apiUrl = (window.GOOGLE_DRIVE_LOGOS_API_URL || "").trim();
  if (!window.isStaticHost() && apiUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const ids = normalizeMarqueeLogos(data);
          if (ids.length > 0) {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(ids));
            } catch (e) {}
            return ids;
          }
        }
      }
    } catch (err) {}
  }

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return normalizeMarqueeLogos(parsed);
    }
  } catch (e) {}

  return window.DEFAULT_MARQUEE_LOGOS;
};
