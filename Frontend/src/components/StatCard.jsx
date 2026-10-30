import { Grid, Paper, Box, Typography } from '@mui/material';

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

export default StatCard;
