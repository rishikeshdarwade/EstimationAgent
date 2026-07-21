import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Fade from '@mui/material/Fade'

const STAGES = [
  { icon: '📄', text: 'Parsing your requirements document…' },
  { icon: '🔍', text: 'Extracting and sanitising requirement blocks…' },
  { icon: '🚀', text: 'Sending to IBM watsonx Agentic Estimation Engine…' },
  { icon: '🧠', text: 'Agent is analysing complexity and scope…' },
  { icon: '📚', text: 'Querying historical delivery benchmarks…' },
  { icon: '⚖️', text: 'Applying variance buffers and confidence scoring…' },
  { icon: '🏗️', text: 'Allocating WBS hours across engineering roles…' },
  { icon: '✍️', text: 'Compiling assumptions and open queries…' },
  { icon: '📊', text: 'Finalising estimation profile…' },
  { icon: '⏳', text: 'Almost there — waiting for agent response…' },
]

const STAGE_INTERVAL = 6000  // ms per stage
const TICK_MS        = 300   // progress bar tick interval

// Maximum progress the bar can reach BEFORE the response arrives.
// It will never auto-advance past this value — the final jump to 100
// happens only when the parent unmounts this component (response received).
const MAX_AUTO_PROGRESS = 89

export default function AnalysisLoader() {
  const [stageIndex, setStageIndex] = useState(0)
  const [visible, setVisible]       = useState(true)
  const [progress, setProgress]     = useState(0)

  // ── Stage cycling ────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setStageIndex((i) => (i + 1 < STAGES.length ? i + 1 : i))
        setVisible(true)
      }, 400)
    }, STAGE_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  // ── Progress bar advancement ─────────────────────────────────────────────
  // Total expected duration = STAGES.length * STAGE_INTERVAL ms
  // We spread 0 → MAX_AUTO_PROGRESS evenly across that window,
  // then slow to a near-halt so it never reaches 90 on its own.
  useEffect(() => {
    const totalMs      = STAGES.length * STAGE_INTERVAL
    const incrementPerTick = (MAX_AUTO_PROGRESS / (totalMs / TICK_MS))

    const tick = setInterval(() => {
      setProgress((p) => {
        if (p >= MAX_AUTO_PROGRESS) {
          // Crawl at 0.01% per tick so the bar still breathes but never hits 90
          return Math.min(p + 0.01, MAX_AUTO_PROGRESS)
        }
        return p + incrementPerTick
      })
    }, TICK_MS)
    return () => clearInterval(tick)
  }, [])

  const stage = STAGES[stageIndex]

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
        textAlign: 'center',
      }}
    >
      {/* Animated icon */}
      <Fade in={visible} timeout={400}>
        <Typography
          sx={{
            fontSize: '3.5rem',
            lineHeight: 1,
            mb: 2,
            filter: 'drop-shadow(0 2px 6px rgba(15,98,254,0.3))',
          }}
        >
          {stage.icon}
        </Typography>
      </Fade>

      {/* Stage label */}
      <Fade in={visible} timeout={400}>
        <Typography
          variant="h6"
          fontWeight={600}
          color="primary.main"
          sx={{ mb: 0.5, minHeight: 36 }}
        >
          {stage.text}
        </Typography>
      </Fade>

      {/* Sub-label */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Stage {stageIndex + 1} of {STAGES.length} · IBM Plains Runtime Rebels Estimation Engine
      </Typography>

      {/* Progress bar */}
      <Box sx={{ width: '100%', maxWidth: 480 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: 'linear-gradient(90deg, #0f62fe 0%, #6ea6ff 100%)',
            },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" color="text.disabled">
            Analysing…
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {Math.round(progress)}%
          </Typography>
        </Box>
      </Box>

      {/* Stage dots */}
      <Box sx={{ display: 'flex', gap: 0.75, mt: 3 }}>
        {STAGES.map((_, i) => (
          <Box
            key={i}
            sx={{
              width: i === stageIndex ? 20 : 8,
              height: 8,
              borderRadius: 4,
              bgcolor: i === stageIndex
                ? 'primary.main'
                : i < stageIndex
                ? 'primary.light'
                : 'grey.300',
              transition: 'all 0.4s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  )
}
