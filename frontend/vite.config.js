import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: `npm run dev` proxies the API to the Python server on :8000.
// Build: output goes to ../web, which the Python server serves.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/data": "http://127.0.0.1:8000",
    },
  },
  build: {
    outDir: "../web",
    emptyOutDir: true,
  },
});
