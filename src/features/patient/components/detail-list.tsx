/**
 * A labelled card of read-only rows -- the shape every block on the Personal
 * Information screen takes.
 *
 * A row with no value shows an em dash rather than being hidden, so the screen
 * says "we do not have this yet" instead of pretending the field is not part
 * of the profile.
 */
export function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-6 py-6 last:border-b-0 sm:px-8">
      <h2 className="text-sm font-bold text-ink-900">{title}</h2>
      <dl className="mt-4 space-y-3.5">{children}</dl>
    </section>
  );
}

export function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="text-[0.8125rem] text-ink-500">{label}</dt>
      <dd className="text-right text-[0.8125rem] font-semibold text-ink-900">
        {value ? value : <span className="font-normal text-ink-300">&mdash;</span>}
      </dd>
    </div>
  );
}
