import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // Относительные пути: работает и на localhost, и на GitHub Pages (/имя-репо/)
  base: "./",
  server: {
    cors: true, // Owlbear грузит manifest.json с localhost из другого домена
    // Chrome/Opera блокируют запросы сайтов из интернета к localhost (Local/Private Network Access)
    headers: { "Access-Control-Allow-Private-Network": "true" },
  },
  build: {
    rollupOptions: {
      input: {
        popover: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "background.html"),
        sheet: resolve(__dirname, "sheet.html"),
      },
    },
  },
});
