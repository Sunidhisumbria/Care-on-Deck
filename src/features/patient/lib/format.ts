/** Display helpers for the account screens. Never throw on missing data. */

/** `1994-07-12` -> `12/07/1994`, in the viewer's locale. */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** `female` -> `Female`. Stored lowercase; shown as written. */
export function titleCase(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function fullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(' ');
}
