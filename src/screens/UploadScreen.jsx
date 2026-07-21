import { useState, useRef } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import BoltIcon from '@mui/icons-material/Bolt'
import parseDocument from '../utils/parseDocument.js'
import runEstimation from '../utils/agentClient.js'
import AnalysisLoader from '../components/AnalysisLoader.jsx'

const ACCEPTED_EXTENSIONS = ['docx', 'xlsx', 'xls', 'txt']

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

export default function UploadScreen({ onResult, isLoading, onLoadingChange }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging]     = useState(false)
  const [error, setError]               = useState('')

  const fileInputRef  = useRef(null)
  const loaderRef     = useRef(null)   // scroll target

  const handleFileSelect = (file) => {
    if (!file) return
    setError('')
    const ext = getExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type ".${ext}". Please upload a .docx, .xlsx, .xls, or .txt file.`)
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (!isLoading) handleFileSelect(e.dataTransfer.files[0])
  }

  const handleInputChange = (e) => {
    handleFileSelect(e.target.files[0])
    e.target.value = ''
  }

  const handleDropzoneClick = () => {
    // Block click-to-browse while loading
    if (!isLoading) fileInputRef.current?.click()
  }

  const handleSubmit = async () => {
    if (!selectedFile || isLoading) return
    setError('')
    onLoadingChange(true)

    // Scroll the loader into view after React re-renders it
    requestAnimationFrame(() => {
      setTimeout(() => {
        loaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    })

    try {
      const text = await parseDocument(selectedFile)
      const data = await runEstimation(text)
      onResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      onLoadingChange(false)
    }
  }

  const handleClearFile = (e) => {
    e.stopPropagation()
    if (isLoading) return   // block clear while loading
    setSelectedFile(null)
    setError('')
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>

      {/* ── Page heading ── */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Managed Capacity Estimation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload a requirements document to generate an AI-powered WBS estimation.
          <br />
          Supported formats: <strong>.docx</strong>, <strong>.xlsx</strong>,{' '}
          <strong>.xls</strong>, <strong>.txt</strong>
        </Typography>
      </Box>

      {/* ── Drop zone — visually dimmed and non-interactive while loading ── */}
      <Box
        onClick={handleDropzoneClick}
        onDragOver={isLoading ? undefined : handleDragOver}
        onDragLeave={isLoading ? undefined : handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: isLoading
            ? 'grey.200'
            : isDragging ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          bgcolor: isLoading ? 'grey.50' : isDragging ? 'primary.50' : 'background.paper',
          p: 6,
          textAlign: 'center',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.45 : 1,
          pointerEvents: isLoading ? 'none' : 'auto',
          transition: 'border-color 0.2s, background-color 0.2s, opacity 0.3s',
          '&:hover': isLoading ? {} : {
            borderColor: 'primary.main',
            bgcolor: 'grey.50',
          },
        }}
      >
        <UploadFileIcon
          sx={{ fontSize: 56, color: isDragging ? 'primary.main' : 'grey.400', mb: 1 }}
        />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {isDragging ? 'Drop your file here' : 'Drag & drop your document here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to browse files
        </Typography>
        <Typography variant="caption" color="text.disabled">
          .docx · .xlsx · .xls · .txt
        </Typography>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.xlsx,.xls,.txt"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </Box>

      {/* ── File preview card ── */}
      {selectedFile && (
        <Card
          variant="outlined"
          sx={{ mt: 3, opacity: isLoading ? 0.45 : 1, transition: 'opacity 0.3s' }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
            <InsertDriveFileIcon color="primary" sx={{ fontSize: 36 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" fontWeight={600} noWrap title={selectedFile.name}>
                {selectedFile.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>
            <Chip
              label={`.${getExtension(selectedFile.name)}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {/* Clear button — hidden while loading */}
            {!isLoading && (
              <Button
                size="small"
                color="inherit"
                onClick={handleClearFile}
                sx={{ minWidth: 0, color: 'text.disabled' }}
              >
                ✕
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Error alert ── */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError('')}>
          <Typography
            variant="body2"
            component="pre"
            sx={{ whiteSpace: 'pre-wrap', m: 0, fontFamily: 'inherit' }}
          >
            {error}
          </Typography>
        </Alert>
      )}

      {/* ── Analysis loader — scroll anchor ── */}
      <Box ref={loaderRef}>
        {isLoading && <AnalysisLoader />}
      </Box>

      {/* ── Submit button — hidden while loading ── */}
      {!isLoading && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            disabled={!selectedFile}
            onClick={handleSubmit}
            startIcon={<BoltIcon />}
            sx={{ px: 4, py: 1.5, fontSize: '1rem' }}
          >
            Run Agentic Estimation Analysis
          </Button>
        </Box>
      )}
    </Container>
  )
}
