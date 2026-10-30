export const IO_CATEGORIES = {
  income: [
    'Sueldo',
    'Freelance',
    'Ventas',
    'Inversiones',
    'Reintegros',
    'Otros ingresos',
  ],
  expense: [
    'Alimentación',
    'Vivienda',
    'Servicios',
    'Transporte',
    'Salud',
    'Educación',
    'Ocio',
    'Compras',
    'Impuestos',
    'Otros gastos',
  ],
};

export const DEFAULT_IO_CATEGORY = {
  income: 'Otros ingresos',
  expense: 'Otros gastos',
};

export const ALL_IO_CATEGORIES = [...new Set([
  ...IO_CATEGORIES.income,
  ...IO_CATEGORIES.expense,
])];
