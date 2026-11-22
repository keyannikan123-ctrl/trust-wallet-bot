
import { formatUnits } from 'viem';

export const num = (v, digits = 2) =>
  Number.isFinite(Number(v))
    ? Number(v).toLocaleString('en-US', {
        maximumFractionDigits: digits,
      })
    : '—';

export const usd = (v) =>
  '$' + num(v, Number(v) < 1 ? 6 : 2);

export const tok = (v) => {
  try {
    return v == null
      ? '—'
      : num(Number(formatUnits(BigInt(v), 18)), 6);
  } catch {
    return '—';
  }
};

export const field = (obj, name, index) =>
  obj?.[name] ?? obj?.[index];

export const pct = (v) =>
  v === undefined ? '—' : v ? 'Yes' : 'No';
