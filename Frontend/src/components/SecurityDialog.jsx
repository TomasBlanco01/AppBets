import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  IconButton, Tooltip, Alert, Divider, CircularProgress,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import authService from '../services/auth';

const formatDate = (iso) => (iso
  ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
  : 'nunca');

// Passkeys registradas y cierre de sesión global.
const SecurityDialog = ({ open, onClose }) => {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const supported = authService.supportsPasskeys();

  const load = useCallback(() => {
    setLoading(true);
    authService.listPasskeys()
      .then(setPasskeys)
      .catch(() => setMessage({ severity: 'error', text: 'No se pudieron cargar las passkeys (sin conexión).' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      setMessage(null);
      load();
    }
  }, [open, load]);

  const handleAdd = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await authService.registerPasskey();
      setMessage({ severity: 'success', text: 'Listo: la próxima vez podés entrar con este dispositivo.' });
      load();
    } catch (error) {
      if (error?.name === 'InvalidStateError') {
        setMessage({ severity: 'info', text: 'Este dispositivo ya tiene una passkey registrada.' });
      } else if (!authService.isPasskeyCancel(error)) {
        setMessage({ severity: 'error', text: error.response?.data?.message || 'No se pudo registrar la passkey.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (passkey) => {
    if (!window.confirm(`¿Quitar la passkey de ${passkey.deviceName || 'este dispositivo'}?`)) return;
    try {
      await authService.deletePasskey(passkey.id);
      load();
    } catch {
      setMessage({ severity: 'error', text: 'No se pudo quitar la passkey.' });
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('¿Cerrar la sesión en todos los dispositivos, incluido este?')) return;
    try {
      await authService.logoutAll();
    } catch {
      setMessage({ severity: 'error', text: 'No se pudo cerrar las sesiones. Revisá la conexión.' });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#1a2332', color: 'white', backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FingerprintIcon color="primary" /> Seguridad
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          Entrar con Face ID / huella
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Registrá este dispositivo para entrar sin escribir la contraseña.
        </Typography>

        {message && <Alert severity={message.severity} sx={{ mb: 1.5 }}>{message.text}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
            {passkeys.length === 0 && (
              <Typography variant="body2" color="text.secondary">Todavía no hay passkeys registradas.</Typography>
            )}
            {passkeys.map((p) => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid #2a3a4a', borderRadius: 1 }}>
                <FingerprintIcon sx={{ color: 'text.secondary' }} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{p.deviceName || 'Dispositivo'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Agregada {formatDate(p.createdAt)} · último uso {formatDate(p.lastUsedAt)}
                  </Typography>
                </Box>
                <Tooltip title="Quitar">
                  <IconButton size="small" color="error" onClick={() => handleDelete(p)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}

        {supported ? (
          <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={handleAdd} disabled={busy}>
            {busy ? 'Esperando al dispositivo…' : 'Agregar este dispositivo'}
          </Button>
        ) : (
          <Alert severity="info">Este navegador no soporta passkeys.</Alert>
        )}

        <Divider sx={{ my: 2, borderColor: '#2a3a4a' }} />

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Sesiones</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Si perdiste un celular o entraste desde otro lado, cerrá todas las sesiones.
        </Typography>
        <Button fullWidth variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogoutAll}>
          Cerrar sesión en todos los dispositivos
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#9aa0a6' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SecurityDialog;
