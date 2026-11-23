const red = {
  50: "#fff1f2",
  100: "#ffe4e6",
  200: "#fecdd3",
  300: "#ffa4a8",
  400: "#ff5a62",
  500: "#e50914",
  600: "#b80710",
  700: "#8a050c",
  800: "#5c0308",
  900: "#380205",
  950: "#200103",
};

module.exports = {
  content: ["./desktop.html", "./mobile.html", "./pricing-config.js", "./projects-config.js", "./logos-config.js"],
  theme: {
    extend: {
      colors: { violet: red, purple: red },
      fontFamily: { sans: ["Inter", "sans-serif"] },
    },
  },
};
