import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

/**
 * Reads a File object using FileReader.readAsArrayBuffer.
 * Returns a Promise that resolves to an ArrayBuffer.
 */
function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Reads a File object using FileReader.readAsText.
 * Returns a Promise that resolves to a plain text string.
 */
function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * Parses a browser File object into a plain text string.
 *
 * Supported formats:
 *   .txt  — native FileReader.readAsText
 *   .docx — mammoth.extractRawText from ArrayBuffer
 *   .xlsx / .xls — SheetJS XLSX.read, all sheets joined as CSV
 *
 * @param {File} file - The browser File object to parse.
 * @returns {Promise<string>} The extracted plain text content.
 * @throws {Error} If the file type is not supported.
 */
async function parseDocument(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'txt') {
    return readAsText(file)
  }

  if (ext === 'docx') {
    const arrayBuffer = await readAsArrayBuffer(file)
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const arrayBuffer = await readAsArrayBuffer(file)
    // XLSX.read expects a Uint8Array or ArrayBuffer
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
    const sheetTexts = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      return `=== Sheet: ${sheetName} ===\n${XLSX.utils.sheet_to_csv(sheet)}`
    })
    return sheetTexts.join('\n\n')
  }

  throw new Error(
    `Unsupported file type: .${ext}. Please upload a .docx, .xlsx, .xls, or .txt file.`
  )
}

export default parseDocument
