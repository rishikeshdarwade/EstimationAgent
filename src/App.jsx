import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import UploadScreen from './screens/UploadScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'

// Inline SVG logo — matches the favicon, no extra file import needed
const AppLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"
    style={{ width: 36, height: 36, flexShrink: 0 }}>
    <circle cx="16" cy="16" r="16" fill="rgba(255,255,255,0.15)"/>
    <rect x="6"  y="18" width="4" height="8" rx="1" fill="white"/>
    <rect x="12" y="12" width="4" height="14" rx="1" fill="white" opacity="0.85"/>
    <rect x="18" y="8"  width="4" height="18" rx="1" fill="white" opacity="0.7"/>
    <path d="M24 6 L21 13 H24 L20 20 L27 11 H23.5 Z" fill="white" opacity="0.95"/>
  </svg>
)

function App() {
  const [estimationResult, setEstimationResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleResult = (data) => {
    setEstimationResult(data)
  }

  const handleReset = () => {
    setEstimationResult(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Top AppBar ── */}
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ gap: 1.5 }}>
          <AppLogo />
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Estimation Solution
            </Typography>
            <Typography variant="caption" component="div" sx={{ opacity: 0.85, letterSpacing: '0.04em' }}>
              IBM Plains Runtime Rebels
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Main Content Area ── */}
      <Box sx={{ flex: 1 }}>
        {estimationResult === null ? (
          <UploadScreen
            onResult={handleResult}
            isLoading={isLoading}
            onLoadingChange={setIsLoading}
          />
        ) : (
          <DashboardScreen
            data={estimationResult}
            onReset={handleReset}
          />
        )}
      </Box>
    </Box>
  )
}

export default App
