import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/investigate': 'http://127.0.0.1:8000',
      '/investigation': 'http://127.0.0.1:8000',
      '/graph': 'http://127.0.0.1:8000',
      '/report': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/voice': 'http://127.0.0.1:8000',
    },
  },
})
