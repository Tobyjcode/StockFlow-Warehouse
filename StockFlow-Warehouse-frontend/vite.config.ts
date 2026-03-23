import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Set this to the HTTPS URL from:
        // StockFlow-Warehouse/Properties/launchSettings.json
        target: 'http://localhost:5212',
        changeOrigin: true,
        secure: false,
      },
      '/login': {
        target: 'http://localhost:5212',
        changeOrigin: true,
        secure: false,
      },
      '/register': {
        target: 'http://localhost:5212',
        changeOrigin: true,
        secure: false,
      },
      '/logout': {
        target: 'http://localhost:5212',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
