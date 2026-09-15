/** The soft magenta band every account screen opens with. */
export function AccountHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="relative overflow-hidden bg-brand-50 py-14 text-center lg:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-5">
        <h1 className="text-[2rem] font-extrabold tracking-tight text-ink-900 lg:text-[2.5rem]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-500">{subtitle}</p>
      </div>
    </section>
  );
}
