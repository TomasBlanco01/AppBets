import { Container, Grid, Divider } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import StatCard from './StatCard';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const IODashboard = ({ movements }) => {
  const totalIncome = movements.filter(m => m.type === 'income').reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = movements.filter(m => m.type === 'expense').reduce((sum, m) => sum + m.amount, 0);
  const balance = totalIncome - totalExpenses;

  return (
    <Container maxWidth="xl">
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <StatCard
          icon={<TrendingUpIcon sx={{ fontSize: 36 }} />}
          label="Total Ingresos"
          value={formatMoney(totalIncome)}
          color="success"
          gradient="linear-gradient(135deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 100%)"
        />
        <StatCard
          icon={<TrendingDownIcon sx={{ fontSize: 36 }} />}
          label="Total Gastos"
          value={formatMoney(totalExpenses)}
          color="error"
          gradient="linear-gradient(135deg, rgba(255,23,68,0.08) 0%, rgba(255,23,68,0.02) 100%)"
        />
        <StatCard
          icon={<AccountBalanceWalletIcon sx={{ fontSize: 36 }} />}
          label="Balance"
          value={formatMoney(balance)}
          color={balance >= 0 ? 'success' : 'error'}
          gradient={balance >= 0
            ? 'linear-gradient(135deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 100%)'
            : 'linear-gradient(135deg, rgba(255,23,68,0.08) 0%, rgba(255,23,68,0.02) 100%)'}
        />
      </Grid>

      <Divider sx={{ borderColor: '#2a3a4a', mb: 3 }} />
    </Container>
  );
};

export default IODashboard;
