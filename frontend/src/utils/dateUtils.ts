export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}.${m}.${iso.slice(0, 4)}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
