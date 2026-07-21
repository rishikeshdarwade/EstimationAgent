# Managed Capacity Estimation Studio — Implementation Plan

## Top-Level Overview

**Goal:** Build a fully client-side (frontend-only) React web application that allows architects and delivery managers to upload requirement documents (`.docx`, `.xlsx`, `.xls`, `.txt`), parse them entirely in the browser, call the IBM watsonx Agentic Estimation Workflow API directly from the browser, and display interactive WBS estimations in a dashboard with Excel export capability.

**Scope:**
- Pure React + Material UI single-page application — **no backend server**.
- All document parsing runs in the browser using `mammoth` (`.docx`) and `SheetJS/xlsx` (`.xlsx`/`.xls`).
- The Agentic API is called directly from the browser via `axios` (API key embedded in the bundle — acceptable for prototype).
- The app is structured to be statically hostable on GitHub Pages (deployment itself is out of scope for this phase).
- Excel export is client-side via SheetJS.

**Out of Scope (this plan):**
- Backend server of any kind
- Authentication / user management
- Persistent database storage
- GitHub Pages deployment / CI-CD (next phase)

**Key Decisions Recorded:**
- Architecture: **100% frontend-only, no server**
- Hosting target: **GitHub Pages** (static files only — future phase)
- Document parsing: **mammoth.js** for `.docx`, **SheetJS `xlsx`** for `.xlsx`/`.xls`, native `FileReader` for `.txt` — all in-browser
- API call: **Direct browser `axios` POST** to the Agentic endpoint with the API key embedded in the source
- API key management: **Hard-coded in a dedicated config file** (`src/config.js`) with a comment marking it for future environment variable migration
- API response handling: **Defensive mixed-response parsing** — the API returns summary prose followed by a JSON block; the frontend scans the response text, extracts the outermost JSON block using a brace-counting scan, captures the prose before it as `summary_text`
- Excel export format: **Two-tab workbook** (Executive Summary + WBS Detail)
- Branding: **"Estimation Solution — IBM Plains Runtime Rebels"**
- Build tool: **Vite + React** (fast builds, straightforward static output in `dist/`)

---

## Sub-Task 1 — Project Scaffold & Dev Environment

**Status:** `[x] done`

**Intent:**
Establish the project folder structure, install all dependencies, and verify the dev server runs — so all subsequent sub-tasks have a clean, runnable base to build on.

**Expected Outcomes:**
- A Vite + React project at the workspace root (or a `frontend/` subfolder) with all npm dependencies installed.
- A `src/config.js` file containing the hard-coded API key and endpoint URL as named exports.
- A root `.gitignore` covering `node_modules/`, `dist/`, and `.env`.
- A `README.md` with local dev setup instructions (`npm install` + `npm run dev`).
- `npm run dev` starts the Vite dev server successfully.

**Todo List:**
1. Bootstrap the project using Vite: `npm create vite@latest . -- --template react` at the workspace root.
2. Install all required dependencies:
   ```
   npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
   npm install axios xlsx mammoth
   ```
3. Create `src/config.js` with:
   - `export const AGENT_API_URL` = the full Agentic endpoint URL
   - `export const AGENT_API_KEY` = the hard-coded API key string
   - A comment: `// TODO: migrate to import.meta.env.VITE_API_KEY for production`
4. Clean out the Vite boilerplate from `src/App.jsx` and `src/main.jsx` (remove default counter demo content).
5. Write `.gitignore` and `README.md`.
6. Verify `npm run dev` launches without errors.

**Relevant Context:**
- Vite's static build output goes to `dist/` — this is what GitHub Pages will serve in the future.
- `mammoth` converts `.docx` to plain text via `mammoth.extractRawText({ arrayBuffer })`.
- `SheetJS` (`xlsx`) reads `.xlsx`/`.xls` via `XLSX.read(arrayBuffer, { type: 'array' })`.
- Both libraries work entirely from an `ArrayBuffer` obtained via the browser's `FileReader` API — no server needed.

---

## Sub-Task 2 — Client-Side Document Parser Utility

**Status:** `[x] done`

**Intent:**
Implement a browser-side utility module that accepts a `File` object and returns a plain text string, replacing the Python `parser.py` that no longer exists. This is the direct equivalent of the old backend parser, now running entirely in the browser.

**Expected Outcomes:**
- A `src/utils/parseDocument.js` module exporting a single async function `parseDocument(file: File): Promise<string>`.
- Supported formats:
  - `.txt` — read via `FileReader.readAsText`.
  - `.docx` — convert to raw text via `mammoth.extractRawText({ arrayBuffer })`.
  - `.xlsx` / `.xls` — read with `XLSX.read`, iterate all sheets, stringify all cell values.
- Throws a descriptive `Error` for unsupported file types.
- Works entirely in-browser, no network calls.

**Todo List:**
1. Create `src/utils/parseDocument.js`.
2. Write a helper `readAsArrayBuffer(file)` that wraps `FileReader` in a `Promise` resolving to an `ArrayBuffer`.
3. Write a helper `readAsText(file)` that wraps `FileReader.readAsText` in a `Promise`.
4. Implement `.txt` branch: call `readAsText(file)`, return the string directly.
5. Implement `.docx` branch: call `readAsArrayBuffer(file)`, pass to `mammoth.extractRawText({ arrayBuffer })`, return `result.value`.
6. Implement `.xlsx`/`.xls` branch: call `readAsArrayBuffer(file)`, pass to `XLSX.read(data, { type: 'array' })`, iterate `workbook.SheetNames`, use `XLSX.utils.sheet_to_csv()` on each sheet, join all sheets with `\n\n`.
7. Add the `throw new Error('Unsupported file type: ...')` guard for other extensions.
8. Export `parseDocument` as the default export.

**Relevant Context:**
- `mammoth` is imported as `import mammoth from 'mammoth'`.
- `xlsx` is imported as `import * as XLSX from 'xlsx'`.
- File extension is derived from `file.name.split('.').pop().toLowerCase()`.
- `sheet_to_csv` produces cleaner text than `sheet_to_txt` for tabular data.

---

## Sub-Task 3 — Agentic API Client Utility

**Status:** `[x] done`

**Intent:**
Implement the browser-side API call logic that sends the extracted document text to the Agentic Workflow endpoint and returns the parsed `{ summary_text, context_id, estimations }` object — replacing the Python proxy endpoint entirely.

**Expected Outcomes:**
- A `src/utils/agentClient.js` module exporting a single async function `runEstimation(documentText: string): Promise<{ summary_text, context_id, estimations }>`.
- Builds the correct request payload with `output_type`, `input_type`, `input_value`, and a fresh `crypto.randomUUID()` session ID.
- Sends `POST` to `AGENT_API_URL` with header `x-api-key: AGENT_API_KEY` via `axios`.
- Implements **defensive mixed-response parsing** via a `extractJsonFromText(text)` helper:
  - Uses a brace-counting scan (not regex) to find the outermost `{...}` block.
  - Returns `{ summaryText, parsed }` where `summaryText` is everything before the first `{`.
- Returns `{ summary_text, context_id, estimations }` on success.
- Throws a descriptive `Error` (including the raw response text) if no parseable JSON block is found.

**Todo List:**
1. Create `src/utils/agentClient.js`.
2. Import `axios` and `{ AGENT_API_URL, AGENT_API_KEY }` from `../config`.
3. Write the `extractJsonFromText(text)` helper using a brace-depth counter loop: scan character by character, record the index of the first `{`, increment/decrement depth on `{`/`}`, stop when depth returns to 0 — return the substring and the prefix.
4. Write the `runEstimation(documentText)` async function:
   - Build the payload object.
   - Call `axios.post(AGENT_API_URL, payload, { headers: { 'x-api-key': AGENT_API_KEY, 'Content-Type': 'application/json' } })`.
   - Extract `responseText` from `response.data` (handle both string and object responses: if already an object, re-serialize to string first).
   - Call `extractJsonFromText(responseText)`.
   - Parse the extracted JSON string with `JSON.parse()`.
   - Return `{ summary_text: summaryText.trim(), context_id: parsed.context_id, estimations: parsed.estimations }`.
5. On any failure, throw `new Error('Failed to parse agent response: ' + rawText)`.

**Relevant Context:**
- `crypto.randomUUID()` is available natively in all modern browsers — no `uuid` npm package needed.
- The Agentic API may return `response.data` as a JS object (if axios auto-parses) or as a string. The handler must cover both cases.
- The brace-counting approach correctly handles nested JSON objects, which simple regex cannot.

---

## Sub-Task 4 — Application Shell & Theme

**Status:** `[x] done`

**Intent:**
Set up the React application shell: MUI global theme, persistent `AppBar` with branding, and top-level state management to coordinate the two screens.

**Expected Outcomes:**
- A MUI theme with IBM Carbon Blue (`#0f62fe`) as the primary colour.
- `App.jsx` holds two state values: `estimationResult` (null or the response object) and `isLoading` (boolean).
- A persistent `<AppBar>` visible on both screens displaying:
  - Primary line: **"Estimation Solution"** (Typography h6)
  - Secondary line: **"IBM Plains Runtime Rebels"** (Typography caption)
- Conditional rendering: `<UploadScreen>` when `estimationResult === null`, `<DashboardScreen>` otherwise.

**Todo List:**
1. Create `src/theme.js` — `createTheme` with `palette.primary.main: '#0f62fe'` and `palette.secondary.main: '#393939'`.
2. In `src/main.jsx`, wrap `<App>` with `<ThemeProvider theme={theme}>` and `<CssBaseline />`.
3. In `App.jsx`:
   - Add `estimationResult` and `isLoading` state with `useState`.
   - Render a top-level `<Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>`.
   - Render `<AppBar position="static">` containing a `<Toolbar>` with the two `<Typography>` elements stacked using a `<Box sx={{ display: 'flex', flexDirection: 'column' }}>`.
   - Below the AppBar, conditionally render `<UploadScreen>` or `<DashboardScreen>` based on `estimationResult`.
4. Create stub files `src/screens/UploadScreen.jsx` and `src/screens/DashboardScreen.jsx` that return a placeholder `<div>` so the app compiles.

**Relevant Context:**
- No React Router needed — two-screen conditional render in `App.jsx` is sufficient.
- Pass `onResult`, `isLoading`, `onLoadingChange` as props to `<UploadScreen>`.
- Pass `data` and `onReset` as props to `<DashboardScreen>`.

---

## Sub-Task 5 — Upload Screen (Screen 1)

**Status:** `[x] done`

**Intent:**
Build the file upload screen: drag-and-drop zone, file preview card, and the submit button that orchestrates `parseDocument` → `runEstimation` → transition to the dashboard.

**Expected Outcomes:**
- A styled drag-and-drop dropzone accepting `.docx`, `.xlsx`, `.xls`, `.txt`.
- A file preview card showing filename, size (KB/MB), and file type once a file is selected.
- A **"⚡ Run Agentic Estimation Analysis"** button that:
  1. Calls `parseDocument(file)` to extract text client-side.
  2. Calls `runEstimation(text)` to hit the Agentic API.
  3. Calls `onResult(data)` on success to transition to the dashboard.
- A `<LinearProgress>` bar shown while loading.
- A `<Alert severity="error">` shown on failure with a human-readable message.
- Client-side file extension validation before any processing begins.

**Todo List:**
1. Build `src/screens/UploadScreen.jsx`.
2. Add local `selectedFile` and `error` state.
3. Create the dropzone `<Box>` with `onDragOver` (prevent default), `onDrop` (set file), and a hidden `<input type="file" accept=".docx,.xlsx,.xls,.txt">` triggered by clicking the box.
4. Validate file extension on file selection — set `error` and abort if unsupported.
5. Render the file preview `<Card>` when `selectedFile` is set: show name, formatted size, and extension badge.
6. Implement `handleSubmit`:
   - Set `onLoadingChange(true)`.
   - `const text = await parseDocument(selectedFile)`.
   - `const data = await runEstimation(text)`.
   - `onResult(data)`.
   - Catch errors: set local `error` state with `err.message`.
   - Finally: `onLoadingChange(false)`.
7. Render the **"⚡ Run Agentic Estimation Analysis"** `<Button variant="contained">` — disabled when no file selected or `isLoading` is true.
8. Render `<LinearProgress>` conditionally when `isLoading`.
9. Render `<Alert severity="error">` conditionally when `error` is set.

**Relevant Context:**
- `parseDocument` and `runEstimation` are both async — `handleSubmit` must be `async` with proper `try/catch/finally`.
- File size formatted as: `size < 1024*1024 ? (size/1024).toFixed(1)+' KB' : (size/1024/1024).toFixed(1)+' MB'`.
- The dropzone `<Box>` should visually respond to drag-over state using a local `isDragging` boolean state.

---

## Sub-Task 6 — WBS Dashboard Screen (Screen 2)

**Status:** `[x] done`

**Intent:**
Build the interactive estimation results dashboard with the Agent Summary accordion, KPI cards, expandable WBS table, and the export trigger.

**Expected Outcomes:**
- A collapsible **"Agent Analysis Summary"** `<Accordion>` (collapsed by default) showing `data.summary_text` as preformatted text — rendered only when `summary_text` is non-empty.
- Three KPI cards: **Total Effort Hours**, **Average Confidence Score (%)**, **Complexity Distribution** (Simple / Medium / Complex counts).
- An MUI `<Table>` with one row per estimation: `Req ID`, `Title`, `Complexity` (colour-coded `<Chip>`), `Confidence`, `Total Hours`, and per-role WBS hours columns.
- Expandable `<Collapse>` panel per row showing `Assumptions & Open Queries` (bulleted list) and `Historical Benchmarks` (list with similarity context).
- **"📥 Export to Excel"** button calling `exportToExcel(data.estimations)`.
- **"← New Estimation"** button calling `onReset()`.

**Todo List:**
1. Create `src/screens/DashboardScreen.jsx`.
2. Render the page header: `<Typography variant="h5">Estimation Results</Typography>` with `context_id` as a grey subtitle.
3. Render action buttons row: **"← New Estimation"** (outlined) and **"📥 Export to Excel"** (contained) aligned to the right.
4. Conditionally render the **"Agent Analysis Summary"** `<Accordion>` when `data.summary_text` is truthy — content is a `<Box component="pre">` with the prose text.
5. Compute KPI values using `useMemo`:
   - `totalHours`: sum of `est.total_estimated_hours`.
   - `avgConfidence`: mean of `est.confidence_score * 100`.
   - `complexityCounts`: `{ Simple: n, Medium: n, Complex: n }` by reducing over `est.complexity_assessment.tier`.
6. Render three `<Card>` KPI tiles in a `<Grid container spacing={2}>`.
7. Render `<TableContainer><Table>` with fixed header columns: expand-toggle, Req ID, Title, Complexity, Confidence, Total Hours, then one column per WBS role.
8. For each row in `data.estimations`:
   - Render the main `<TableRow>` with all column values.
   - Look up each WBS role hours from `est.wbs_allocation` by matching `role` name (default `0`).
   - Render a secondary `<TableRow>` containing a `<TableCell colSpan={all}>` with a `<Collapse>` controlled by per-row `expandedRow` state.
   - Inside the Collapse, render two sections: `Assumptions & Open Queries` and `Historical Benchmarks`.
9. Apply `<Chip>` colours: `color="success"` for Simple, `color="warning"` for Medium, `color="error"` for Complex.
10. Import and call `exportToExcel` (stub from Sub-Task 7 to be completed next).

**Relevant Context:**
- Use a `expandedRows` state object `{ [requirement_id]: boolean }` to track which rows are open.
- WBS roles in display order: `Frontend`, `Backend`, `Security`, `Architect`, `Testing`, `Deployment`, `Integration`.
- `data.context_id` may be undefined if the model did not include it — render it conditionally.

---

## Sub-Task 7 — Excel Export Utility

**Status:** `[x] done`

**Intent:**
Implement the two-tab Excel export using SheetJS, producing a structured `.xlsx` download from the estimations data entirely in the browser.

**Expected Outcomes:**
- `src/utils/exportToExcel.js` exports a single function `exportToExcel(estimations)`.
- **Tab 1 — "Executive Summary"**: columns: `Requirement ID`, `Title`, `Complexity Tier`, `Confidence Score (%)`, `Total Estimated Hours`, `# Assumptions`, `# Historical Benchmarks`.
- **Tab 2 — "WBS Detail"**: columns: `Requirement ID`, `Title`, then one column per WBS role, then `Total Hours`.
- Downloaded as `MCES_Estimation_YYYY-MM-DD.xlsx`.
- Column headers are bold.

**Todo List:**
1. Create `src/utils/exportToExcel.js` and import `* as XLSX from 'xlsx'`.
2. Build the Summary sheet rows: `estimations.map(est => ({ 'Requirement ID': est.requirement_id, 'Title': est.title, 'Complexity Tier': est.complexity_assessment.tier, 'Confidence Score (%)': (est.confidence_score * 100).toFixed(1), 'Total Estimated Hours': est.total_estimated_hours, '# Assumptions': est.assumptions_and_queries.length, '# Historical Benchmarks': est.historical_benchmarks.length }))`.
3. Build the WBS Detail sheet rows: for each estimation, create a row object with `Requirement ID`, `Title`, then look up each role's hours from `wbs_allocation` by `role` name (default `0`), and add `Total Hours`.
4. Convert both arrays to worksheets with `XLSX.utils.json_to_sheet()`.
5. Apply bold headers: after creating each sheet, iterate over the header row cells (row 0, columns A through last) and set `sheet[cellAddress].s = { font: { bold: true } }`.
6. Create a workbook with `XLSX.utils.book_new()`, append both sheets with `XLSX.utils.book_append_sheet()`.
7. Generate the filename using `new Date().toISOString().split('T')[0]`.
8. Call `XLSX.writeFile(wb, filename)` to trigger the browser download.

**Relevant Context:**
- SheetJS cell style (`s` property) requires the `xlsx` package to be used with `{ cellStyles: true }` option — pass `{ bookType: 'xlsx', cellStyles: true }` to `XLSX.write` if using `writeFile`.
- WBS role order for columns: `Frontend`, `Backend`, `Security`, `Architect`, `Testing`, `Deployment`, `Integration`.

---

## Sub-Task 8 — Integration & Polish

**Status:** `[x] done`

**Intent:**
Validate the full end-to-end browser-only flow, resolve any integration gaps, and apply final UI polish for enterprise quality.

**Expected Outcomes:**
- Full flow works in browser: select file → parse in-browser → call Agentic API → parse mixed response → dashboard renders → Excel exports correctly.
- All three file types (`.docx`, `.xlsx`, `.txt`) parse successfully.
- Mixed-response parsing handles prose-before-JSON correctly.
- Error states render cleanly (bad file type, API failure, parse failure).
- Responsive layout works at 1280px and 1440px.
- `README.md` updated with final local dev instructions and a note that the app is GitHub Pages-ready (`npm run build` produces `dist/`).

**Todo List:**
1. Run `npm run dev` and test the full upload-to-dashboard flow.
2. Test `.docx`, `.xlsx`, and `.txt` files to confirm in-browser parsing produces readable text.
3. Verify the Agentic API call succeeds and the brace-counting parser extracts the JSON block correctly.
4. Confirm `summary_text` Accordion renders when prose is present and is hidden when absent.
5. Verify KPI card calculations against a known response payload.
6. Test Excel export: open the file and confirm both tabs contain correct data with bold headers.
7. Test error states: unsupported file type, API failure (disconnect network), unparseable response.
8. Add MUI `<Tooltip>` labels to all icon buttons for accessibility.
9. Verify the "← New Estimation" reset clears state and returns to the upload screen cleanly.
10. Run `npm run build` and confirm the `dist/` folder is produced with no build errors — this is the static artifact that GitHub Pages will serve in the next phase.
11. Update `README.md` with final instructions.
