import { Container, Grid, Paper, Box, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

const HomeCard = ({ icon, title, description, onClick }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Paper
      onClick={onClick}
      sx={{
        p: 4,
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
          icon={<AccountBalanceIcon sx={{ fontSize: 56 }} />}
          title="🏦 Banca"
          description="Depósitos y retiros por casa: balances, beneficio y movimientos."
          onClick={() => onSelect('bank')}
        />
        <HomeCard
          icon={<TrackChangesIcon sx={{ fontSize: 56 }} />}
          title="🎯 Apuestas"
          description="Registrá tus pronósticos, marcá ganadas/perdidas y seguí tu ROI."
          onClick={() => onSelect('bets')}
        />
      </Grid>
    </Container>
  );
};

export default HomeScreen;
