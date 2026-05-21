import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // chokidar's inotify-based watcher misses host edits over Docker's
    // bind mounts on macOS/Windows; poll instead so HMR picks up file
    // changes reliably.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
