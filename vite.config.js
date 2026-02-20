import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // Add COOP/COEP headers required for SharedArrayBuffer (ONNX Runtime / kokoro-js)
    {
      name: 'cross-origin-isolation',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          next()
        })
      }
    }
  ],
  base: '/ecomsim/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          kokoro: ['kokoro-js']
        }
      }
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['kokoro-js']  // don't pre-bundle — lazy load as dynamic import
  }
})
