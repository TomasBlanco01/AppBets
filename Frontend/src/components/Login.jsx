import { useState } from 'react';
import { Container, Paper, Box, Typography, TextField, Button, Alert } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import authService from '../services/auth';

const Login = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      await authService.login(password);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="xs">
        <Paper
          component="form"
          onSubmit={handleSubmit}
          sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(15,25,35,0.6)', border: '1px solid #2a3a4a' }}
        >
          <LockIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
            AppBets
          </Typography>
          <TextField
            type="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoFocus
            sx={{ mb: 2 }}
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
              {error}
            </Alert>
          )}
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            Entrar
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
