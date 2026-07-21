import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import UploadScreen from './screens/UploadScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'

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
        <Toolbar>
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
