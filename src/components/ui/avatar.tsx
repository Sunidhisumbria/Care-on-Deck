/**
 * A person's avatar: their photo when there is one, their initials otherwise.
 *
 * One component for the account menu, the dashboard and booking. Those used to
 * draw their own, and disagreed about how to read "Dr. Sarah Williams, MD" --
 * one showed "D", one "SW". Size belongs to the caller: pass the height, width
 * and text size in `className`.
 *
 * Decorative in both forms. Everywhere an avatar appears, the name is written
 * beside it, and reading it out twice helps nobody.
 */
export function Avatar({
  name,
  url = null,
  className = 'h-10 w-10 text-sm',
}: {
  name: string;
  url?: string | null;
  className?: string;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- avatar host is not known until upload lands
    return <img src={url} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 ${className}`}
    >
      {initials(name)}
    </span>
  );
}

/** "Dr. Sarah Williams, MD" -> "SW". Titles and post-nominals are not initials. */
export function initials(name: string): string {
  const letters = name
    .replace(/^Dr\.?\s+/i, '')
    .replace(/,.*$/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return letters || '?';
}
