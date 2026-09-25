import { AccountHero } from '@/features/patient/components/account-hero';
import { CampaignReport } from '@/features/pulse/components/campaign-report';

/** IA: 9. Campaign Report. */
export default async function CampaignReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AccountHero title="Campaign Report Details" subtitle="How this campaign is turning into appointments." />
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <CampaignReport id={id} />
      </div>
    </>
  );
}
