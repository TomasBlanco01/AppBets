import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import BetsView from './components/BetsView'
import IOView from './components/IOView'
import Login from './components/Login'
import { Typography, Container, Box, Button, IconButton, Tooltip } from "@mui/material";
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LogoutIcon from '@mui/icons-material/Logout';
import exportService from './services/export';
import authService from './services/auth';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/roboto/900.css';

const SECTION_SUBTITLES = {
  home: 'Gestión Financiera Personal',
  bets: 'Bets — Depósitos y Retiros',
  io: 'I/O — Ingresos y Gastos',
};

const App = () => {
  const [view, setView] = useState('home');
  const [authed, setAuthed] = useState(authService.isAuthenticated());

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0a1929 0%, #1a2332 50%, #0d2137 100%)',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          pb: 1,
          // En iPhone instalado como PWA el contenido arranca debajo de la
          // barra de estado/Dynamic Island; sumamos ese espacio para que el
          // navbar y los botones queden siempre accesibles.
          pt: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        }}
      >
        <Container maxWidth="xl" sx={{ position: 'relative' }}>
          <Tooltip title="Exportar backup (.json)">
            <IconButton
              onClick={() => exportService.downloadBackup()}
              sx={{ position: 'absolute', top: 0, right: 56, color: 'text.secondary' }}
            >
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cerrar sesión">
            <IconButton
              onClick={() => authService.logout()}
              sx={{ position: 'absolute', top: 0, right: 16, color: 'text.secondary' }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
          <Box
            onClick={() => setView('home')}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 0.5, cursor: 'pointer' }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography
              variant="h4"
              align="center"
              sx={{
                fontWeight: 900,
                background: 'linear-gradient(135deg, #00e676 0%, #69f0ae 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '2px',
              }}
            >
              Ges.Eco
            </Typography>
            <SavingsIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
          </Box>
          <Typography
            variant="subtitle2"
            align="center"
            color="text.secondary"
            sx={{ mb: 1, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.7rem' }}
          >
            {SECTION_SUBTITLES[view]}
          </Typography>
        </Container>
      </Box>

      {view !== 'home' && (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => setView('home')}
            sx={{ color: 'text.secondary' }}
          >
            Inicio
          </Button>
        </Container>
      )}

      {view === 'home' && <HomeScreen onSelect={setView} />}
      {view === 'bets' && <BetsView />}
      {view === 'io' && <IOView />}
    </Box>
  );
};

export default App;
