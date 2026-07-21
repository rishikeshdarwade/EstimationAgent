// Route API calls:
//   - Development (npm run dev): through the Vite middleware proxy at /api/proxy
//   - Production (GitHub Pages): through the deployed Cloudflare Worker
//
// import.meta.env.DEV is true during `npm run dev`, false in `npm run build`
// import.meta.env.VITE_WORKER_URL can be set in a .env.production file once
// the Worker is deployed.
const PROXY_URL = import.meta.env.DEV
  ? '/api/proxy'
  : (import.meta.env.VITE_WORKER_URL || '/api/proxy')

/**
 * Extracts summary prose and the JSON block from the agent's text field.
 *
 * The agent returns a `text` string structured as:
 *   <prose summary>
 *   ---
 *   ```json
 *   { ... }
 *   ```
 *
 * Strategy:
 *   1. Try to extract content inside a ```json ... ``` fenced code block first.
 *   2. Fall back to brace-counting scan for a raw JSON object.
 *
 * @param {string} text
 * @returns {{ summaryText: string, jsonString: string }}
 */
function extractJsonFromText(text) {
  // Strategy 1: fenced ```json ... ``` block (what the real API returns)
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (fenceMatch) {
    const jsonString = fenceMatch[1].trim()
    const summaryText = text.slice(0, fenceMatch.index).trim()
    return { summaryText, jsonString }
  }

  // Strategy 2: brace-counting scan for raw JSON object
  let depth = 0
  let startIndex = -1
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '{') {
      if (depth === 0) startIndex = i
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0 && startIndex !== -1) {
        return {
          summaryText: text.slice(0, startIndex).trim(),
          jsonString: text.slice(startIndex, i + 1),
        }
      }
    }
  }

  return { summaryText: text, jsonString: '' }
}

/**
 * Normalises one raw estimation object from the real API schema into the
 * internal shape the dashboard and export utilities expect.
 *
 * Real API schema (key differences from original plan):
 *   est.complexity.classification   → tier
 *   est.wbs_hours.{frontend,...}    → wbs_allocation array of { role, estimated_hours }
 *   est.confidence                  → confidence_score
 *   est.assumptions_and_queries     → same (array of strings)
 *   est.historical_benchmarks[].historical_id  → same
 *   est.historical_benchmarks[].evidence       → maps to similarity_context
 */
function normaliseEstimation(est) {
  // Build wbs_allocation array from flat wbs_hours object.
  // The API is inconsistent — keys may be lowercase ("frontend") or Title Case ("Frontend").
  // Normalise by lowercasing all keys in wbs_hours before lookup.
  const WBS_ROLES = ['Frontend', 'Backend', 'Security', 'Architect', 'Testing', 'Deployment', 'Integration']
  const wbsHours = est.wbs_hours ?? {}
  const wbsHoursLower = Object.fromEntries(
    Object.entries(wbsHours).map(([k, v]) => [k.toLowerCase(), v])
  )
  const wbs_allocation = WBS_ROLES.map((role) => ({
    role,
    estimated_hours: wbsHoursLower[role.toLowerCase()] ?? 0,
  }))

  // Normalise complexity
  const complexityRaw = est.complexity ?? {}
  const complexity_assessment = {
    tier: complexityRaw.classification ?? complexityRaw.tier ?? '—',
    justification: complexityRaw.justification ?? '',
  }

  // Normalise historical benchmarks
  const historical_benchmarks = (est.historical_benchmarks ?? []).map((b) => ({
    historical_id: b.historical_id ?? '',
    similarity_context: b.evidence ?? b.similarity_context ?? '',
  }))

  return {
    requirement_id: est.requirement_id ?? '',
    title: est.title ?? '',
    complexity_assessment,
    confidence_score: est.confidence ?? est.confidence_score ?? 0,
    assumptions_and_queries: est.assumptions_and_queries ?? [],
    historical_benchmarks,
    wbs_allocation,
    total_estimated_hours: est.total_estimated_hours ?? 0,
  }
}

/**
 * Sends extracted document text to the Agentic Estimation API via the local
 * Vite proxy, then navigates the real Langflow response envelope to extract
 * the agent's text output and parse estimations from it.
 *
 * Real response path:
 *   response.outputs[0].outputs[0].results.message.text
 *
 * @param {string} documentText
 * @returns {Promise<{ summary_text: string, context_id: string|null, estimations: Array }>}
 */
async function runEstimation(documentText) {
  const payload = {
    output_type: 'chat',
    input_type: 'chat',
    input_value: documentText,
    session_id: crypto.randomUUID(),
  }

  let response
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new Error(`Network error reaching proxy: ${err.message}`)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`API error ${response.status}: ${errorText || response.statusText}`)
  }

  // Parse the outer Langflow envelope as JSON
  let envelope
  try {
    envelope = await response.json()
  } catch {
    throw new Error('API response was not valid JSON.')
  }

  // Navigate the real response path:
  // envelope.outputs[0].outputs[0].results.message.text
  const agentText =
    envelope?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ??
    envelope?.outputs?.[0]?.outputs?.[0]?.artifacts?.message ??
    null

  if (!agentText || typeof agentText !== 'string') {
    throw new Error(
      `Could not locate agent text in API response.\n\nResponse:\n${JSON.stringify(envelope, null, 2)}`
    )
  }

  // Extract summary prose and JSON block from the agent text
  const { summaryText, jsonString } = extractJsonFromText(agentText)

  if (!jsonString) {
    throw new Error(
      `No JSON block found in agent text.\n\nAgent text:\n${agentText}`
    )
  }

  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch (parseErr) {
    throw new Error(
      `Found JSON block but could not parse it: ${parseErr.message}\n\nBlock:\n${jsonString}`
    )
  }

  const rawEstimations = parsed.estimations ?? []
  const estimations = rawEstimations.map(normaliseEstimation)

  return {
    summary_text: summaryText,
    context_id: parsed.context_id ?? null,
    estimations,
  }
}

export default runEstimation
