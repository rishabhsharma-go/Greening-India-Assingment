import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/projects': 'http://localhost:8000',
      '/tasks': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/parcels': 'http://localhost:8000',
      '/telemetry': 'http://localhost:8000',
      '/trees': 'http://localhost:8000',
      '/audits': 'http://localhost:8000',
    }
  }
})
