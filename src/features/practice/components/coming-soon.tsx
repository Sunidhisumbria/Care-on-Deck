import { AccountHero } from '@/features/patient/components/account-hero';

/**
 * A menu destination that is designed but not built yet. It says so plainly
 * rather than showing invented numbers or an empty table that looks broken.
 */
export function ComingSoon({ title, subtitle, what }: { title: string; subtitle: string; what: string }) {
  return (
    <>
      <AccountHero title={title} subtitle={subtitle} />
      <div className="mx-auto max-w-3xl px-5 py-10 lg:py-12">
        <div className="rounded-card border border-line bg-white p-8 text-center">
          <p className="text-sm font-semibold text-ink-900">This section is coming soon.</p>
          <p className="mt-2 text-sm text-ink-500">{what}</p>
        </div>
      </div>
    </>
  );
}
