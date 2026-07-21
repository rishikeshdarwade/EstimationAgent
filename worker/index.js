/**
 * Cloudflare Worker — Estimation Agent API Proxy
 *
 * Forwards POST requests from the browser (GitHub Pages) to the Langflow
 * Agentic Estimation API, adding the x-api-key header server-side.
 *
 * This solves the browser CORS restriction: the Worker runs at Cloudflare's
 * edge (not in a browser), so it is not subject to CORS enforcement.
 *
 * Deploy:
 *   cd worker
 *   npm install
 *   npx wrangler login
 *   npx wrangler deploy
 *
 * After deploy, copy the Worker URL (e.g. https://estimation-proxy.YOUR-SUBDOMAIN.workers.dev)
 * into src/config.js as AGENT_PROXY_URL.
 */

// ── Configuration ─────────────────────────────────────────────────────────────
// Store the API key as a Cloudflare Worker secret (never hardcode in source):
//   npx wrangler secret put AGENT_API_KEY
// The AGENT_API_URL below is the upstream Langflow endpoint.
const AGENT_API_URL =
  'https://langflow.servicesessentials.ibm.com/api/v1/run/a2a3eba8-b8b2-4fba-be0c-d8be93cb046d'

// Allowed browser origins — add your GitHub Pages URL here once deployed
const ALLOWED_ORIGINS = [
  'https://rishikeshdarwade.github.io',  // GitHub Pages production
  'http://localhost:5174',                // Vite dev server
  'http://localhost:5173',                // Vite dev server (alternate port)
]

function getAllowedOrigin(requestOrigin) {
  if (ALLOWED_ORIGINS.includes(requestOrigin)) return requestOrigin
  // Allow any localhost port during development
  if (requestOrigin && requestOrigin.startsWith('http://localhost:')) return requestOrigin
  return ALLOWED_ORIGINS[0] // default to GitHub Pages origin
}

function corsHeaders(requestOrigin) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''

    // ── Handle CORS preflight ────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      })
    }

    // ── Only accept POST ─────────────────────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // ── Read API key from Worker secret (set via: wrangler secret put AGENT_API_KEY)
    const apiKey = env.AGENT_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured on Worker' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // ── Forward request to Langflow ──────────────────────────────────────────
    let body
    try {
      body = await request.text()
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    let upstreamResponse
    try {
      upstreamResponse = await fetch(AGENT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body,
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: `Upstream fetch failed: ${err.message}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // ── Stream response back to browser with CORS headers ────────────────────
    const responseBody = await upstreamResponse.text()
    return new Response(responseBody, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(origin),
      },
    })
  },
}
