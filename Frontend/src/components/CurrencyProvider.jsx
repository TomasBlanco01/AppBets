import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api';
import { CurrencyContext } from '../context/currency';
import { buildUsdConverter } from '../utils/fx';
import { formatMoney, formatCompactMoney } from '../utils/money';

const PREFS_KEY = 'geseco_currency_prefs';
const ratesKey = (casa) => `geseco_fx_${casa}`;

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin espacio o en modo privado: la preferencia dura solo esta sesión.
  }
};

// Elige si los totales y gráficos se muestran en pesos o en dólares (y con qué
// cotización). Las cotizaciones se guardan en localStorage para poder mostrar
// USD también sin conexión.
const CurrencyProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(() => readJson(PREFS_KEY, { currency: 'ARS', casa: 'blue' }));
  const [rates, setRates] = useState(() => readJson(ratesKey(prefs.casa), null));
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    writeJson(PREFS_KEY, prefs);
  }, [prefs]);

  useEffect(() => {
    if (prefs.currency !== 'USD') return undefined;

    let cancelled = false;
    setRates(readJson(ratesKey(prefs.casa), null));
    setStatus('loading');

    api.get(`/fx/${prefs.casa}`)
      .then(({ data }) => {
        if (cancelled) return;
        setRates(data);
        writeJson(ratesKey(prefs.casa), data);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error obteniendo cotizaciones:', error);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [prefs.currency, prefs.casa]);

  const setCurrency = useCallback((currency) => setPrefs((prev) => ({ ...prev, currency })), []);
  const setCasa = useCallback((casa) => setPrefs((prev) => ({ ...prev, casa })), []);

  const value = useMemo(() => {
    const hasRates = Boolean(rates?.history?.length) && rates.casa === prefs.casa;
    // Sin cotizaciones (primera vez y sin conexión) seguimos mostrando pesos.
    const currency = prefs.currency === 'USD' && hasRates ? 'USD' : 'ARS';
    const toUsd = currency === 'USD' ? buildUsdConverter(rates) : null;

    return {
      currency,
      requestedCurrency: prefs.currency,
      casa: prefs.casa,
      rates: hasRates ? rates : null,
      status,
      setCurrency,
      setCasa,
      amountOf: (movement) => (toUsd ? toUsd(movement.amount, movement.date) : movement.amount),
      format: (n) => formatMoney(n, currency),
      formatCompact: (n) => formatCompactMoney(n, currency),
    };
  }, [prefs, rates, status, setCurrency, setCasa]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export default CurrencyProvider;
