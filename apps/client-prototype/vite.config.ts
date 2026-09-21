import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local development proxies the API under the same origin so the browser
// never needs CORS. The Origin header is stripped on the way to the API:
// the vite proxy makes the request look like a same-origin server call,
// which is what the local API boundary expects.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // The sandbox proxies the dev server under a dynamic *.e2b.app host.
    allowedHosts: [".e2b.app"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        headers: { origin: "" }
      },
      "/health": {
        target: "http://127.0.0.1:3000",
        headers: { origin: "" }
      }
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
