import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e676',
      light: '#69f0ae',
      dark: '#00c853',
    },
    secondary: {
      main: '#ffd740',
      light: '#ffe57f',
      dark: '#ffc400',
    },
    success: {
      main: '#00e676',
    },
    error: {
      main: '#ff1744',
    },
    background: {
      default: '#0f1923',
      paper: '#1a2332',
    },
    text: {
      primary: '#e8eaed',
      secondary: '#9aa0a6',
    },
    divider: '#2a3a4a',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '0.5px',
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #2a3a4a',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00c853 0%, #00e676 100%)',
          color: '#0f1923',
          fontWeight: 700,
          '&:hover': {
            background: 'linear-gradient(135deg, #00e676 0%, #69f0ae 100%)',
          },
        },
        containedError: {
          background: 'linear-gradient(135deg, #d50000 0%, #ff1744 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #ff1744 0%, #ff5252 100%)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        outlinedSuccess: {
          borderColor: '#00e676',
          color: '#00e676',
        },
        outlinedError: {
          borderColor: '#ff1744',
          color: '#ff1744',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#0f1923',
            color: '#9aa0a6',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '1px',
            borderBottom: '2px solid #00e676',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            '&:hover': {
              backgroundColor: '#1e2d3d',
            },
          },
          '& .MuiTableCell-body': {
            borderBottom: '1px solid #2a3a4a',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#2a3a4a',
            },
            '&:hover fieldset': {
              borderColor: '#00e676',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00e676',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#9aa0a6',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: '#9aa0a6',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '16px',
          paddingRight: '16px',
        },
      },
    },
  },
});

export default theme;
