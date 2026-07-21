import { createTheme } from '@mui/material/styles'

// IBM Carbon Blue 60 as primary, IBM Gray 80 as secondary
const theme = createTheme({
  palette: {
    primary: {
      main: '#0f62fe',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#393939',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f4f4',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"IBM Plex Sans"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
})

export default theme
