import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // Относительные пути — сайт живёт в подпапке GitHub Pages (/owlbear-module/)
  base: "./",
  build: {
    rollupOptions: {
      input: {
        popover: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "background.html"),
        sheet: resolve(__dirname, "sheet.html"),
        menu: resolve(__dirname, "menu.html"),
      },
    },
  },
});
