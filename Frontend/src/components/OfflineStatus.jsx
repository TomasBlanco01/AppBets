import { Container, Alert, Button } from '@mui/material';

// Avisos de sincronización compartidos por I/O y Bets.
const OfflineStatus = ({ pendingCount, serverUnavailable, syncError, onClearError, syncing, onRetry }) => {
  if (pendingCount === 0 && !serverUnavailable && !syncError) return null;

  const retryButton = (text) => (
    <Button color="inherit" size="small" disabled={syncing} onClick={onRetry}>
      {text}
    </Button>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} action={retryButton(syncing ? 'Sincronizando…' : 'Reintentar')}>
          {pendingCount === 1
            ? 'Hay 1 movimiento guardado localmente. Se sincronizará cuando el servidor esté disponible.'
            : `Hay ${pendingCount} movimientos guardados localmente. Se sincronizarán cuando el servidor esté disponible.`}
        </Alert>
      )}

      {serverUnavailable && pendingCount === 0 && (
        <Alert severity="info" sx={{ mb: 2 }} action={retryButton('Reintentar')}>
          No se pudo conectar con el servidor. Podés seguir cargando movimientos; se guardarán localmente.
        </Alert>
      )}

      {syncError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
          {syncError}
        </Alert>
      )}
    </Container>
  );
};

export default OfflineStatus;
