/** The soft magenta band each booking step opens with. */
export function BookingHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="relative overflow-hidden bg-brand-50 py-10 text-center lg:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-5">
        <h1 className="text-[1.75rem] font-extrabold tracking-tight text-ink-900 lg:text-[2.25rem]">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
      </div>
    </section>
  );
}
