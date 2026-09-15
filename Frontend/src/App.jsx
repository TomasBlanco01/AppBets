import { useState } from 'react'
import React from 'react'
import HomeScreen from './components/HomeScreen'
import BankView from './components/BankView'
import BetsView from './components/BetsView'
import Login from './components/Login'
import { Typography, Container, Box, Avatar, Button, IconButton, Tooltip } from "@mui/material";
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
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

export const pageLogos = {
  BetWinner: '/pages/betwinner.ico',
  Betano: '/pages/betano.ico',
  Stake: '/pages/stake.ico',
  Bet365: '/pages/bet365.ico',
  JugaBet: '/pages/jugabet.ico',
  DBbet: '/pages/dbbet.png',
  'Bets VIP': '/pages/betsvip.svg',
  'Subs VIP': '/pages/subsvip.svg',
};

const AVATAR_COLORS = ['#00e676', '#ffd740', '#29b6f6', '#ff7043', '#ab47bc', '#26a69a', '#ec407a', '#8d6e63'];

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getInitials = (name) => name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

// Avatar de página: usa el logo si existe en pageLogos, o iniciales sobre un color
// estable (derivado del nombre) para páginas sin logo, como DBbet o las creadas por el usuario.
export const PageAvatar = ({ name, size = 38 }) => {
  const logo = pageLogos[name];
  if (logo) {
    return <Avatar src={logo} sx={{ width: size, height: size, bgcolor: 'transparent' }} />;
  }
  const color = AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: color, color: '#0f1923', fontWeight: 700, fontSize: size * 0.4 }}>
      {getInitials(name)}
    </Avatar>
  );
};

// Avatar de persona (tipster): siempre iniciales sobre un color estable derivado del nombre.
export const PersonAvatar = ({ name, size = 38 }) => {
  const color = AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: color, color: '#0f1923', fontWeight: 700, fontSize: size * 0.4 }}>
      {getInitials(name)}
    </Avatar>
  );
};

const SECTION_SUBTITLES = {
  home: 'Control Financiero de Apuestas Deportivas',
  bank: 'Banca — Depósitos y Retiros',
  bets: 'Apuestas — Pronósticos y Resultados',
};

const App = () => {
  const [view, setView] = useState('home');
  const [authed, setAuthed] = useState(authService.isAuthenticated());

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0a1929 0%, #1a2332 50%, #0d2137 100%)',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          pb: 1,
          pt: 2,
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
            <SportsEsportsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
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
              AppBets
            </Typography>
            <EmojiEventsIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
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
      {view === 'bank' && <BankView />}
      {view === 'bets' && <BetsView />}
    </Box>
  );
};

export default App;
