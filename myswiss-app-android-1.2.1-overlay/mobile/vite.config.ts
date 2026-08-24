import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  root: dirname,
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(dirname, "../shared") } },
  build: { outDir: path.resolve(dirname, "dist"), emptyOutDir: true }
});
