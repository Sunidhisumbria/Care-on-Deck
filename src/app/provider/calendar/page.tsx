import { AccountHero } from '@/features/patient/components/account-hero';
import { CalendarScreen } from '@/features/practice/components/calendar-screen';

/** IA: 7. Calendar & Schedule. */
export default function ProviderCalendarPage() {
  return (
    <>
      <AccountHero
        title="Calendar & Schedule"
        subtitle="View appointments and manage your availability across locations."
      />
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <CalendarScreen />
      </div>
    </>
  );
}
