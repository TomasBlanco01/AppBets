import { useMemo, useState } from 'react';
import { Container, Paper, Box, Typography, Grid, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import { profitOf, returnOf, stakedAmountOf } from './BetsList';
import { PageAvatar, PersonAvatar } from '../App';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Rachas: solo apuestas cerradas, ordenadas por fecha. "void" no corta la racha (se
// salta); won/half_won extienden racha ganadora, lost/half_lost extienden perdedora.
const computeStreaks = (bets) => {
  const closed = [...bets]
    .filter(b => b.status !== 'pending')
    .sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);

  let current = { type: null, count: 0 };
  let bestWin = 0;
  let worstLoss = 0;

  for (const bet of closed) {
    const isWin = bet.status === 'won' || bet.status === 'half_won';
    const isLoss = bet.status === 'lost' || bet.status === 'half_lost';
    if (!isWin && !isLoss) continue; // void

    const type = isWin ? 'win' : 'loss';
    if (current.type === type) {
      current.count += 1;
    } else {
      current = { type, count: 1 };
    }
    if (type === 'win') bestWin = Math.max(bestWin, current.count);
    if (type === 'loss') worstLoss = Math.max(worstLoss, current.count);
  }

  return { current, bestWin, worstLoss };
};

const groupStats = (bets, keyField, nameField) => {
  const groups = new Map();
  for (const bet of bets) {
    const key = bet[keyField] ?? 'none';
    const name = bet[nameField] || 'Sin especificar';
    if (!groups.has(key)) groups.set(key, { name, bets: [] });
    groups.get(key).bets.push(bet);
  }

  return Array.from(groups.entries()).map(([key, { name, bets: groupBets }]) => {
    const closed = groupBets.filter(b => b.status !== 'pending' && b.status !== 'void');
    const wins = groupBets.filter(b => b.status === 'won').length + groupBets.filter(b => b.status === 'half_won').length * 0.5;
    const neto = groupBets.reduce((sum, b) => sum + profitOf(b), 0);
    const apostadoCerrado = groupBets.filter(b => b.status !== 'pending').reduce((sum, b) => sum + stakedAmountOf(b), 0);
    const roi = apostadoCerrado ? (neto / apostadoCerrado) * 100 : 0;
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;
    return { key, name, count: groupBets.length, winRate, neto, roi };
  }).sort((a, b) => b.count - a.count);
};

const BreakdownTable = ({ rows, renderAvatar }) => (
  <Table size="small">
    <TableHead>
      <TableRow>
        <TableCell>Nombre</TableCell>
        <TableCell align="center">Apuestas</TableCell>
        <TableCell align="center">% Acierto</TableCell>
        <TableCell align="center">Neto</TableCell>
        <TableCell align="center">ROI</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 2 }}>Sin datos</TableCell></TableRow>
      ) : rows.map((row) => (
        <TableRow key={row.key}>
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {renderAvatar && renderAvatar(row.name)}
              {row.name}
            </Box>
          </TableCell>
          <TableCell align="center">{row.count}</TableCell>
          <TableCell align="center">{row.winRate.toFixed(0)}%</TableCell>
          <TableCell align="center" sx={{ color: row.neto >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
            {formatMoney(row.neto)}
          </TableCell>
          <TableCell align="center" sx={{ color: row.roi >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
            {row.roi.toFixed(1)}%
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const BetsStats = ({ bets }) => {
  const [tab, setTab] = useState(0);

  const streaks = useMemo(() => computeStreaks(bets), [bets]);
  const byPage = useMemo(() => groupStats(bets, 'pageId', 'pageName'), [bets]);
  const byTipster = useMemo(() => groupStats(bets, 'tipsterId', 'tipsterName'), [bets]);
  const bySport = useMemo(() => groupStats(bets, 'sportId', 'sportName'), [bets]);

  if (bets.length === 0) return null;

  const currentLabel = streaks.current.type === 'win'
    ? `${streaks.current.count} ganada${streaks.current.count > 1 ? 's' : ''} seguidas`
    : streaks.current.type === 'loss'
    ? `${streaks.current.count} perdida${streaks.current.count > 1 ? 's' : ''} seguidas`
    : 'Sin racha';

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
          <WhatshotIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Rachas
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Racha actual</Typography>
            <Typography variant="h6" fontWeight={800} color={streaks.current.type === 'win' ? 'success.main' : streaks.current.type === 'loss' ? 'error.main' : 'text.primary'}>
              {currentLabel}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Mejor racha ganadora</Typography>
            <Typography variant="h6" fontWeight={800} color="success.main">{streaks.bestWin}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Peor racha perdedora</Typography>
            <Typography variant="h6" fontWeight={800} color="error.main">{streaks.worstLoss}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2.5, overflow: 'hidden' }}>
        <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
          <LeaderboardIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Estadísticas desglosadas
        </Typography>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} centered sx={{ mb: 1 }}>
          <Tab label="Por Casa" />
          <Tab label="Por Persona" />
          <Tab label="Por Deporte" />
        </Tabs>
        <Box sx={{ overflowX: 'auto' }}>
          {tab === 0 && <BreakdownTable rows={byPage} renderAvatar={(name) => <PageAvatar name={name} size={22} />} />}
          {tab === 1 && <BreakdownTable rows={byTipster} renderAvatar={(name) => name !== 'Sin especificar' && <PersonAvatar name={name} size={22} />} />}
          {tab === 2 && <BreakdownTable rows={bySport} />}
        </Box>
      </Paper>
    </Container>
  );
};

export default BetsStats;
