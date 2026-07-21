import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// Read the API key and URL directly from src/config.js at build/serve time
// so the proxy can inject them server-side without exposing them in the browser bundle.
// We do a simple regex parse to avoid needing a full JS evaluator.
function readConfig() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const raw = readFileSync(path.join(__dirname, 'src/config.js'), 'utf-8')
    const urlMatch  = raw.match(/AGENT_API_URL\s*=\s*['"`]([^'"`]+)['"`]/)
    const keyMatch  = raw.match(/AGENT_API_KEY\s*=\s*['"`]([^'"`]+)['"`]/)
    return {
      url: urlMatch?.[1] ?? '',
      key: keyMatch?.[1] ?? '',
    }
  } catch {
    return { url: '', key: '' }
  }
}

/**
 * Vite plugin: intercepts POST /api/proxy and forwards it to the Langflow
 * endpoint using Node's https module (no browser CORS restrictions).
 *
 * Why a custom middleware instead of Vite's built-in proxy?
 * The API server sets Access-Control-Allow-Origin to its own domain only.
 * Browsers enforce this — Node.js does not. By forwarding through this
 * middleware the request originates from Node (same as Python), not the browser.
 */
function agentProxyPlugin() {
  return {
    name: 'agent-proxy',
    configureServer(server) {
      const cfg = readConfig()
      if (!cfg.url) {
        console.warn('[agent-proxy] Could not read AGENT_API_URL from src/config.js')
        return
      }

      const parsed   = new URL(cfg.url)
      const hostname = parsed.hostname          // langflow.servicesessentials.ibm.com
      const apiPath  = parsed.pathname          // /api/v1/run/<id>
      const apiKey   = cfg.key

      console.log(`[agent-proxy] Proxying POST /api/proxy → https://${hostname}${apiPath}`)

      server.middlewares.use('/api/proxy', (req, res) => {

        // ── CORS preflight ────────────────────────────────────────────────
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          })
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.writeHead(405)
          res.end('Method Not Allowed')
          return
        }

        // ── Collect request body ──────────────────────────────────────────
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => {
          const body = Buffer.concat(chunks)

          // ── Forward to upstream API ───────────────────────────────────
          const options = {
            hostname,
            path: apiPath,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': body.length,
              'x-api-key': apiKey,
              // Spoof the origin so the server sees its own allowed origin
              'Origin': `https://${hostname}`,
              'Referer': `https://${hostname}/`,
            },
          }

          const proxyReq = https.request(options, (proxyRes) => {
            console.log(`[agent-proxy] upstream status: ${proxyRes.statusCode}`)

            // Stream response back — override CORS header so browser accepts it
            const headers = {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': proxyRes.headers['content-type'] || 'application/json',
            }
            if (proxyRes.headers['transfer-encoding']) {
              headers['Transfer-Encoding'] = proxyRes.headers['transfer-encoding']
            }

            res.writeHead(proxyRes.statusCode, headers)
            proxyRes.pipe(res)
          })

          proxyReq.on('error', (err) => {
            console.error('[agent-proxy] upstream error:', err.message)
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `Proxy upstream error: ${err.message}` }))
          })

          proxyReq.write(body)
          proxyReq.end()
        })
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), agentProxyPlugin()],
  server: {
    port: 5174,
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-ui': ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/material', '@mui/icons-material'],
          'vendor-xlsx': ['xlsx'],
          'vendor-mammoth': ['mammoth'],
        },
      },
    },
  },
})
