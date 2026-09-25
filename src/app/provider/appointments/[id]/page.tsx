import { AccountHero } from '@/features/patient/components/account-hero';
import { AppointmentDetailScreen } from '@/features/practice/components/appointment-detail-screen';

/** IA: 6. Appointments > View Details. */
export default async function ProviderAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AccountHero
        title="Appointment Details"
        subtitle="Review your appointment details and stay updated with your upcoming schedule."
      />
      <div className="px-5 py-8 lg:px-8">
        <AppointmentDetailScreen id={id} />
      </div>
    </>
  );
}
