import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: './',
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    plugins: [react()],
    define: {
      'global': 'globalThis',
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
    // Inject process polyfill
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    // Provide process as a global
    esbuild: {
      define: {
        global: 'globalThis',
      },
    },
  }
});
