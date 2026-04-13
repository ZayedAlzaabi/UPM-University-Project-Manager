import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    proxy: {
      '/auth':             'http://localhost:3001',
      '/courses':          'http://localhost:3001',
      '/groups':           'http://localhost:3001',
      '/tasks':            'http://localhost:3001',
      '/support-requests': 'http://localhost:3001',
      '/notifications':    'http://localhost:3001',
    }
  }
})
