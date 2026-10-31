import { Avatar } from '@mui/material';

// Las claves van normalizadas (ver normalizeName): minúsculas, solo letras y números.
const pageLogos = {
  betwinner: '/pages/betwinner.ico',
  betano: '/pages/betano.ico',
  stake: '/pages/stake.ico',
  bet365: '/pages/bet365.ico',
  jugabet: '/pages/jugabet.ico',
  dbbet: '/pages/dbbet.png',
  betsvip: '/pages/betsvip.svg',
  subsvip: '/pages/subsvip.svg',
  betar: '/pages/betar.png',
  azar777: '/pages/azar777.ico',
  betsson: '/pages/betsson.png',
};

// "Bet.ar", "betar" y "Bet ar" usan el mismo logo.
const normalizeName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

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
// estable (derivado del nombre) para las páginas que no tienen logo cargado.
const PageAvatar = ({ name, size = 38 }) => {
  const logo = pageLogos[normalizeName(name)];
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

export default PageAvatar;
