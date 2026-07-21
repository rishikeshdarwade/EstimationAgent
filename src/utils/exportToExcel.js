import * as XLSX from 'xlsx'

// WBS roles in canonical display order
const WBS_ROLES = ['Frontend', 'Backend', 'Security', 'Architect', 'Testing', 'Deployment', 'Integration']

/**
 * Applies bold font styling to every header cell in a worksheet.
 * SheetJS requires cell style objects to be set directly on each cell reference.
 *
 * @param {Object} sheet - SheetJS worksheet object (mutated in place).
 */
function applyBoldHeaders(sheet) {
  if (!sheet['!ref']) return
  const range = XLSX.utils.decode_range(sheet['!ref'])
  // Header row is always row 0 (the first row)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!sheet[cellAddress]) continue
    sheet[cellAddress].s = { font: { bold: true } }
  }
}

/**
 * Looks up the estimated hours for a given WBS role in a wbs_allocation array.
 *
 * @param {Array} wbsAllocation - Array of { role, estimated_hours } objects.
 * @param {string} role - The role name to look up.
 * @returns {number} The estimated hours, or 0 if not found.
 */
function getHoursForRole(wbsAllocation = [], role) {
  const entry = wbsAllocation.find((w) => w.role === role)
  return entry ? (entry.estimated_hours ?? 0) : 0
}

/**
 * Builds and downloads a two-tab Excel workbook from estimation data.
 *
 * Tab 1 — "Executive Summary": one row per requirement with KPI columns.
 * Tab 2 — "WBS Detail": one row per requirement with per-role hours columns.
 *
 * @param {Array} estimations - The estimations array from the Agentic API response.
 */
export function exportToExcel(estimations) {
  if (!estimations || estimations.length === 0) {
    console.warn('exportToExcel: no estimations data to export.')
    return
  }

  // ── Tab 1: Executive Summary ─────────────────────────────────────────────
  const summaryRows = estimations.map((est) => ({
    'Requirement ID': est.requirement_id ?? '',
    'Title': est.title ?? '',
    'Complexity Tier': est.complexity_assessment?.tier ?? '',
    'Confidence Score (%)': est.confidence_score != null
      ? parseFloat((est.confidence_score * 100).toFixed(1))
      : '',
    'Total Estimated Hours': est.total_estimated_hours ?? 0,
    '# Assumptions': est.assumptions_and_queries?.length ?? 0,
    '# Historical Benchmarks': est.historical_benchmarks?.length ?? 0,
  }))

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
  applyBoldHeaders(summarySheet)

  // Set column widths for readability
  summarySheet['!cols'] = [
    { wch: 18 }, // Requirement ID
    { wch: 40 }, // Title
    { wch: 16 }, // Complexity Tier
    { wch: 20 }, // Confidence Score
    { wch: 22 }, // Total Estimated Hours
    { wch: 16 }, // # Assumptions
    { wch: 22 }, // # Historical Benchmarks
  ]

  // ── Tab 2: WBS Detail ────────────────────────────────────────────────────
  const wbsRows = estimations.map((est) => {
    const row = {
      'Requirement ID': est.requirement_id ?? '',
      'Title': est.title ?? '',
    }
    WBS_ROLES.forEach((role) => {
      row[role] = getHoursForRole(est.wbs_allocation, role)
    })
    row['Total Hours'] = est.total_estimated_hours ?? 0
    return row
  })

  const wbsSheet = XLSX.utils.json_to_sheet(wbsRows)
  applyBoldHeaders(wbsSheet)

  // Set column widths
  const wbsCols = [
    { wch: 18 }, // Requirement ID
    { wch: 40 }, // Title
    ...WBS_ROLES.map(() => ({ wch: 14 })), // Per-role columns
    { wch: 14 }, // Total Hours
  ]
  wbsSheet['!cols'] = wbsCols

  // ── Assemble workbook ────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary')
  XLSX.utils.book_append_sheet(wb, wbsSheet, 'WBS Detail')

  // ── Download ─────────────────────────────────────────────────────────────
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `MCES_Estimation_${dateStr}.xlsx`

  XLSX.writeFile(wb, filename, { bookType: 'xlsx', cellStyles: true })
}
