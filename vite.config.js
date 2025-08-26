import { defineConfig } from 'vite'

export default defineConfig({
  // Standard Vite configuration for vanilla JS project
  root: '.',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
})