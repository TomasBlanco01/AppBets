import {
  Container, Grid, Divider, Paper, Box, Typography
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatCard = ({ icon, label, value, subLabel, color, gradient }) => (
  <Grid size={{ xs: 12, sm: 4 }}>
    <Paper
      sx={{
        p: 2.5,
        textAlign: 'center',
        background: gradient,
        border: 'none',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: color === 'success' ? 'linear-gradient(90deg, #00e676, #69f0ae)' :
                     color === 'error' ? 'linear-gradient(90deg, #ff1744, #ff5252)' :
                     'linear-gradient(90deg, #ffd740, #ffe57f)',
        },
      }}
    >
      <Box sx={{ color: `${color}.main`, mb: 0.5 }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={900} color={`${color}.main`} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
      {subLabel && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {subLabel}
        </Typography>
      )}
    </Paper>
  </Grid>
);

const Dashboard = ({ movements }) => {
  const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
  const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);
  const totalProfit = totalWithdrawals - totalDeposits;

  return (
    <Container maxWidth="xl">
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <StatCard
          icon={<TrendingDownIcon sx={{ fontSize: 36 }} />}
          label="Total Depositado"
          value={formatMoney(totalDeposits)}
          color="error"
          gradient="linear-gradient(135deg, rgba(255,23,68,0.08) 0%, rgba(255,23,68,0.02) 100%)"
        />
        <StatCard
          icon={<TrendingUpIcon sx={{ fontSize: 36 }} />}
          label="Total Retirado"
          value={formatMoney(totalWithdrawals)}
          color="success"
          gradient="linear-gradient(135deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 100%)"
        />
        <StatCard
          icon={<AccountBalanceWalletIcon sx={{ fontSize: 36 }} />}
          label="Beneficio"
          value={formatMoney(totalProfit)}
          color={totalProfit >= 0 ? 'success' : 'error'}
          gradient={totalProfit >= 0
            ? 'linear-gradient(135deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 100%)'
            : 'linear-gradient(135deg, rgba(255,23,68,0.08) 0%, rgba(255,23,68,0.02) 100%)'}
        />
      </Grid>

      <Divider sx={{ borderColor: '#2a3a4a', mb: 3 }} />
    </Container>
  );
};

export default Dashboard;
