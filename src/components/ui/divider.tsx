/** The "OR" rule between the form and the social buttons. */
export function Divider({ label = 'OR' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4">
      <span className="h-px flex-1 bg-line" />
      <span className="text-xs font-semibold text-ink-300">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
