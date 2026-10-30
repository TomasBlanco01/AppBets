import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Grid
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PageAvatar from './PageAvatar';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const StatBox = ({ label, value, color }) => (
  <Box
    sx={{
      p: 1.5,
      textAlign: 'center',
      bgcolor: 'rgba(15,25,35,0.6)',
      border: '1px solid #2a3a4a',
      borderRadius: 2,
      height: '100%',
    }}
  >
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', fontSize: '0.62rem' }}
    >
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={900} color={`${color}.main`} sx={{ mt: 0.5 }}>
      {value}
    </Typography>
  </Box>
);

const PageDetailDialog = ({ page, open, onClose, onViewMovements }) => {
  if (!page) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2332', color: 'white', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <PageAvatar name={page.name} size={72} />
        </Box>
        <Typography variant="h6" fontWeight={800}>
          {page.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {page.movementCount} {page.movementCount === 1 ? 'movimiento' : 'movimientos'}
          {page.lastDate ? ` · último: ${formatDate(page.lastDate)}` : ''}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6 }}>
            <StatBox label="Depositado" value={formatMoney(page.deposits)} color="error" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <StatBox label="Retirado" value={formatMoney(page.withdrawals)} color="success" />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <StatBox
              label="En página"
              value={formatMoney(page.balance)}
              color={page.balance > 0 ? 'error' : 'success'}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <StatBox
              label="Beneficio"
              value={formatMoney(page.profit)}
              color={page.profit >= 0 ? 'success' : 'error'}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
          Beneficio = retiros − depósitos. “En página” es lo que sigue dentro de la casa.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center', gap: 1 }}>
        <Button onClick={onClose} sx={{ color: '#9aa0a6' }}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          startIcon={<VisibilityIcon />}
          onClick={() => onViewMovements(page.id)}
        >
          Ver movimientos
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PageDetailDialog;
