import { Avatar } from '@mui/material';

const pageLogos = {
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
const PageAvatar = ({ name, size = 38 }) => {
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

export default PageAvatar;
