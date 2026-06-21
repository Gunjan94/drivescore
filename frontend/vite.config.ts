import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend talks to the local backend on :8000. In dev we proxy /api -> :8000
// so the browser never hits CORS and the same relative paths work in a build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND ?? "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
