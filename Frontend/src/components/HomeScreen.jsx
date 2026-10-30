import { Container, Grid, Paper, Box, Typography } from '@mui/material';
import MoneyIcon from '@mui/icons-material/Money';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const HomeCard = ({ icon, title, description, onClick }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Paper
      onClick={onClick}
      sx={{
        p: 4,
        height: '100%',
        textAlign: 'center',
        cursor: 'pointer',
        bgcolor: 'rgba(15,25,35,0.6)',
        border: '1px solid #2a3a4a',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#00e676',
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0,230,118,0.18)',
        },
      }}
    >
      <Box sx={{ color: 'primary.main', mb: 1.5 }}>{icon}</Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  </Grid>
);

const HomeScreen = ({ onSelect }) => {
  return (
    <Container maxWidth="md" sx={{ mt: 6 }}>
      <Grid container spacing={3}>
        <HomeCard
          icon={<MoneyIcon sx={{ fontSize: 56 }} />}
          title="Bets"
          description="Depósitos y retiros por casa: balances, beneficio y movimientos."
          onClick={() => onSelect('bets')}
        />
        <HomeCard
          icon={<SwapHorizIcon sx={{ fontSize: 56 }} />}
          title="I/O"
          description="Ingresos y gastos personales: registrá cada movimiento y seguí tu balance."
          onClick={() => onSelect('io')}
        />
      </Grid>
    </Container>
  );
};

export default HomeScreen;
