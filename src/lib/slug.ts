/**
 * "Sunrise Family Clinic, P.A." -> "sunrise-family-clinic-p-a".
 *
 * Letters and digits only, so it is safe in a URL and reads the same in every
 * locale. Accents are folded rather than dropped, so "José" becomes "jose", not
 * "jos". Never empty: a name made only of symbols still gets a usable slug.
 */
export function slugify(value: string, maxLength = 100): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
  return slug || 'item';
}
