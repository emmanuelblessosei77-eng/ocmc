import { ServerResponse } from 'node:http'
import { createLogger, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { programmeFallback } from './src/programmeFallback'

let apiUnavailableReported = false
const viteLogger = createLogger()
const logError = viteLogger.error.bind(viteLogger)

viteLogger.error = (message, options) => {
  if (message.includes('http proxy error: /api/')) return
  logError(message, options)
}

export default defineConfig({
  customLogger: viteLogger,
  plugins: [react()],
  server: {
    host: true,
    watch: {
      ignored: ['**/backend/**', '**/public/images/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (error, request, response) => {
            const errorCode = 'code' in error ? error.code : undefined
            const requestPath = request.url?.split('?')[0]
            if (
              errorCode === 'ECONNREFUSED'
              && request.method === 'GET'
              && requestPath === '/api/programmes'
              && response instanceof ServerResponse
              && !response.headersSent
            ) {
              response.writeHead(200, {
                'Cache-Control': 'no-store',
                'Content-Type': 'application/json',
              })
              response.end(JSON.stringify({
                current_page: 1,
                data: programmeFallback,
                data_source: 'local-fallback',
                last_page: 1,
                total: programmeFallback.length,
              }))
              if (!apiUnavailableReported) {
                console.warn('Laravel is unavailable. Serving the local programme catalogue until the API restarts.')
                apiUnavailableReported = true
              }
              return
            }

            if (response instanceof ServerResponse && !response.headersSent) {
              response.writeHead(503, {
                'Cache-Control': 'no-store',
                'Content-Type': 'application/json',
              })
              response.end(JSON.stringify({
                message: 'The local API is starting or unavailable. The development launcher will retry it automatically.',
              }))
            } else {
              response.destroy()
            }

            if (!apiUnavailableReported) {
              console.warn(`Local API unavailable at 127.0.0.1:8000: ${error.message}. Requests will receive 503 until the API restarts.`)
              apiUnavailableReported = true
            }
          })
          proxy.on('proxyRes', () => {
            apiUnavailableReported = false
          })
        },
      },
    },
  },
})
