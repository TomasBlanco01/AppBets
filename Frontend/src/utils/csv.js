// Exportación a CSV pensada para abrir con doble clic en Excel en español:
// separador ";" y coma decimal. El BOM hace que Excel lea bien las tildes.

const escapeCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const formatCsvNumber = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');

// columns: [{ header, value: (row) => any }]
export const toCsv = (rows, columns) => {
  const lines = [
    columns.map((c) => escapeCell(c.header)).join(';'),
    ...rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(';')),
  ];
  const BOM = String.fromCharCode(0xfeff);
  return `${BOM}${lines.join('\r\n')}`;
};

export const downloadCsv = (filename, csv) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
