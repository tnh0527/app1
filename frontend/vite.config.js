import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: ".vite",
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "chart-vendor": [
            "chart.js",
            "react-chartjs-2",
            "chartjs-chart-financial",
          ],
          "map-vendor": ["mapbox-gl", "maplibre-gl"],
          "ui-vendor": ["react-bootstrap", "bootstrap", "@iconify/react"],
          "utils-vendor": ["axios", "moment-timezone", "date-holidays"],
        },
      },
    },
  },
});
