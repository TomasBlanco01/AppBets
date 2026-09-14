import api from '../api';

// Descarga un backup completo (todas las tablas) como archivo .json,
// para migrar a otra base sin depender del archivo SQLite.
const downloadBackup = async () => {
  const { data } = await api.get('/export');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `appbets-backup-${today}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default { downloadBackup };
