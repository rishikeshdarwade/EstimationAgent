# Estimation Solution — IBM Plains Runtime Rebels

A fully client-side React web application for AI-powered software estimation.  
Upload a requirements document (BRD, Enhancement Tracker, or User Story) and receive an interactive WBS estimation dashboard powered by IBM watsonx Agentic Studio.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + Material UI 5 |
| Build Tool | Vite 5 |
| Document Parsing | mammoth.js (`.docx`), SheetJS xlsx (`.xlsx`/`.xls`), FileReader (`.txt`) |
| API Client | axios |
| Excel Export | SheetJS xlsx |
| Hosting Target | GitHub Pages (static, no server required) |

---

## Local Development

### Prerequisites
- Node.js 18+ and npm 9+

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
#    Open src/config.js and replace <YOUR_API_KEY_HERE> with your actual key

# 3. Start the dev server
npm run dev
```

The app will be available at **http://localhost:5173**

---

## Build for Production / GitHub Pages

```bash
npm run build
```

The `dist/` folder contains the fully static build ready for deployment to GitHub Pages (deployment CI/CD is a future phase).

---

## Architecture

This application is **100% frontend-only** — no backend server is required.

```
Browser
  ├── parseDocument.js   — .docx / .xlsx / .txt → plain text (in-browser)
  ├── agentClient.js     — POST to IBM watsonx Agentic API + parse mixed response
  ├── UploadScreen.jsx   — drag-and-drop file upload UI
  ├── DashboardScreen.jsx — WBS estimation results dashboard
  └── exportToExcel.js   — two-tab .xlsx download (SheetJS)
```

---

## Configuration

| File | Purpose |
|---|---|
| `src/config.js` | API endpoint URL and API key (hard-coded for prototype) |

> **Note:** For production, migrate `AGENT_API_KEY` to a Vite environment variable (`import.meta.env.VITE_API_KEY`) stored in a `.env` file that is excluded from git.

---

## Supported File Types

| Format | Parser |
|---|---|
| `.docx` | mammoth.js |
| `.xlsx` / `.xls` | SheetJS xlsx |
| `.txt` | Browser FileReader |
