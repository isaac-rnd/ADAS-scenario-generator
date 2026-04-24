import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the app from /<repo-name>/, so prod assets need that
// prefix; dev stays at root. Override with BASE_PATH if deploying elsewhere.
const BASE = process.env.BASE_PATH ?? "/ADAS-scenario-generator/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? BASE : "/",
  plugins: [react()],
  server: { port: 5173, host: true },
}));
