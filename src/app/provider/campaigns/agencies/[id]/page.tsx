import { AccountHero } from '@/features/patient/components/account-hero';
import { AgencyDetail } from '@/features/pulse/components/agency-detail';

/** IA: 9. Agency Detail. */
export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AccountHero title="Agency Details" subtitle="View agency information, campaign activity, and engagement history." />
      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
        <AgencyDetail id={id} />
      </div>
    </>
  );
}
