import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // En desarrollo, /api se redirige al backend Express
      "/api": "http://localhost:3010",
      // Y /agent se redirige al proceso del agent de IA (summarize),
      // reescribiendo /agent/summarize -> /summarize.
      "/agent": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/agent/, ""),
      },
    },
  },
});
