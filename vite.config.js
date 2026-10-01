import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import contentPlugin from './plugins/content-plugin.js'

export default defineConfig({
  plugins: [contentPlugin(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Dedicated dev-server port so this project never collides with other IDE
  // projects (which grab the default 5173). strictPort = fail loudly instead of
  // silently drifting onto another project's port.
  server: {
    port: 5190,
    strictPort: true,
  },
  base: process.env.NODE_ENV === 'production' ? '/sketch-lab/' : '/',
})
