import {
  Container, Grid, Divider
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StatCard from './StatCard';
import { useCurrency } from '../context/currency';
import { sumByType } from '../utils/finance';

const Dashboard = ({ movements }) => {
  const { amountOf, format: formatMoney } = useCurrency();
  const totalDeposits = sumByType(movements, 'deposit', amountOf);
  const totalWithdrawals = sumByType(movements, 'withdrawal', amountOf);
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
