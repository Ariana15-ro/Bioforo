import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Vite configuration for BioForo.
// Enables the `@/` path alias that points to the `src/` directory.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // Supabase + React keep the main chunk above the default 500kB limit;
    // routes are already code-split, so raise the warning threshold.
    chunkSizeWarningLimit: 700,
  },
});
