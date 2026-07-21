import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Collapse from '@mui/material/Collapse'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DownloadIcon from '@mui/icons-material/Download'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { exportToExcel } from '../utils/exportToExcel.js'

// WBS roles displayed as table columns — order is fixed
const WBS_ROLES = ['Frontend', 'Backend', 'Security', 'Architect', 'Testing', 'Deployment', 'Integration']

function complexityColor(tier) {
  if (!tier) return 'default'
  const t = tier.toLowerCase()
  if (t === 'simple') return 'success'
  if (t === 'medium') return 'warning'
  if (t === 'complex') return 'error'
  return 'default'
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" fontWeight={700} display="block">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ my: 0.5 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// ── Expandable Estimation Row ─────────────────────────────────────────────────
function EstimationRow({ est }) {
  const [open, setOpen] = useState(false)

  const getHours = (role) => {
    const entry = est.wbs_allocation?.find((w) => w.role === role)
    return entry ? entry.estimated_hours : 0
  }

  return (
    <>
      <TableRow
        hover
        sx={{ '& > *': { borderBottom: open ? 'unset' : undefined }, cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Expand toggle */}
        <TableCell padding="checkbox">
          <Tooltip title={open ? 'Collapse details' : 'Expand details'}>
            <IconButton size="small" aria-label={open ? 'collapse row' : 'expand row'}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </Tooltip>
        </TableCell>

        {/* Requirement ID */}
        <TableCell>
          <Typography variant="body2" fontWeight={700} color="primary.main" noWrap>
            {est.requirement_id}
          </Typography>
        </TableCell>

        {/* Title */}
        <TableCell sx={{ maxWidth: 220 }}>
          <Typography variant="body2" noWrap title={est.title}>
            {est.title}
          </Typography>
        </TableCell>

        {/* Complexity chip */}
        <TableCell>
          <Chip
            label={est.complexity_assessment?.tier ?? '—'}
            color={complexityColor(est.complexity_assessment?.tier)}
            size="small"
          />
        </TableCell>

        {/* Confidence */}
        <TableCell align="right">
          <Typography variant="body2">
            {est.confidence_score != null
              ? `${(est.confidence_score * 100).toFixed(0)}%`
              : '—'}
          </Typography>
        </TableCell>

        {/* Total hours */}
        <TableCell align="right">
          <Typography variant="body2" fontWeight={700}>
            {est.total_estimated_hours ?? 0}
          </Typography>
        </TableCell>

        {/* Per-role hours */}
        {WBS_ROLES.map((role) => (
          <TableCell key={role} align="right">
            <Typography variant="body2" color="text.secondary">
              {getHours(role)}
            </Typography>
          </TableCell>
        ))}
      </TableRow>

      {/* ── Expanded detail row ── */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6 + WBS_ROLES.length}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
              <Grid container spacing={3}>

                {/* Complexity justification */}
                {est.complexity_assessment?.justification && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Complexity Justification
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {est.complexity_assessment.justification}
                    </Typography>
                  </Grid>
                )}

                {/* Assumptions & Queries */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Assumptions & Open Queries ({est.assumptions_and_queries?.length ?? 0})
                  </Typography>
                  {est.assumptions_and_queries?.length > 0 ? (
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {est.assumptions_and_queries.map((item, i) => (
                        <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {item}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                      None recorded.
                    </Typography>
                  )}
                </Grid>

                {/* Historical Benchmarks */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Historical Benchmarks ({est.historical_benchmarks?.length ?? 0})
                  </Typography>
                  {est.historical_benchmarks?.length > 0 ? (
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {est.historical_benchmarks.map((b, i) => (
                        <Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          <strong>{b.historical_id}</strong>
                          {b.similarity_context ? ` — ${b.similarity_context}` : ''}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                      None recorded.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

// ── Dashboard Screen ──────────────────────────────────────────────────────────
export default function DashboardScreen({ data, onReset }) {
  const { estimations = [], summary_text = '', context_id } = data

  // Derived KPI values
  const { totalHours, avgConfidence, complexityCounts } = useMemo(() => {
    const totalHours = estimations.reduce((sum, e) => sum + (e.total_estimated_hours ?? 0), 0)
    const avgConfidence =
      estimations.length > 0
        ? estimations.reduce((sum, e) => sum + (e.confidence_score ?? 0), 0) / estimations.length
        : 0
    const complexityCounts = estimations.reduce(
      (acc, e) => {
        const tier = e.complexity_assessment?.tier ?? 'Unknown'
        acc[tier] = (acc[tier] ?? 0) + 1
        return acc
      },
      { Simple: 0, Medium: 0, Complex: 0 }
    )
    return { totalHours, avgConfidence, complexityCounts }
  }, [estimations])

  const complexitySubline = Object.entries(complexityCounts)
    .filter(([, n]) => n > 0)
    .map(([tier, n]) => `${n} ${tier}`)
    .join(' · ')

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>

      {/* ── Page header ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Estimation Results
          </Typography>
          {context_id && (
            <Typography variant="caption" color="text.secondary">
              Context ID: {context_id}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {estimations.length} requirement{estimations.length !== 1 ? 's' : ''} estimated
          </Typography>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Tooltip title="Start a new estimation">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={onReset}
            >
              New Estimation
            </Button>
          </Tooltip>
          <Tooltip title="Download results as Excel workbook">
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => exportToExcel(estimations)}
              disabled={estimations.length === 0}
            >
              Export to Excel
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Agent Analysis Summary accordion ── */}
      {summary_text && (
        <Accordion
          disableGutters
          elevation={0}
          variant="outlined"
          sx={{ mb: 3, '&:before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>
                Agent Analysis Summary
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Divider sx={{ mb: 2 }} />
            <Box
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                color: 'text.secondary',
                m: 0,
              }}
            >
              {summary_text}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Total Effort Hours"
            value={totalHours.toLocaleString()}
            sub={`across ${estimations.length} requirement${estimations.length !== 1 ? 's' : ''}`}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Average Confidence Score"
            value={`${(avgConfidence * 100).toFixed(1)}%`}
            sub="model confidence in estimates"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard
            label="Complexity Distribution"
            value={`${estimations.length} req${estimations.length !== 1 ? 's' : ''}`}
            sub={complexitySubline || 'No complexity data'}
          />
        </Grid>
      </Grid>

      {/* ── WBS Estimations Table ── */}
      {estimations.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.100' } }}>
                <TableCell padding="checkbox" />
                <TableCell>Req ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Complexity</TableCell>
                <TableCell align="right">Confidence</TableCell>
                <TableCell align="right">Total Hrs</TableCell>
                {WBS_ROLES.map((role) => (
                  <TableCell key={role} align="right">
                    {role}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {estimations.map((est) => (
                <EstimationRow key={est.requirement_id} est={est} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            No estimation data available.
          </Typography>
        </Box>
      )}
    </Container>
  )
}
