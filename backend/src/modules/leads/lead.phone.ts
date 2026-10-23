export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = String(raw).trim();
  const intl = d.startsWith('+');
  d = d.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (!intl) {
    if (d.length === 11 && d[0] === '0') d = d.slice(1);
    if (d.length === 10) {
      if (!/^[6-9]/.test(d)) return null;
      d = '91' + d;
    } else if (!(d.length === 12 && d.startsWith('91'))) {
      return null;
    }
  }
  if (d.startsWith('91')) {
    const n = d.slice(2);
    if (!/^[6-9]\d{9}$/.test(n)) return null;
    return '+91' + n;
  }
  if (d.length < 8 || d.length > 15) return null;
  return '+' + d;
}
