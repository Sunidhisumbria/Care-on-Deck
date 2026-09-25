'use client';

import { NotificationList } from '@/features/notifications/notification-list';
import { AccountHero } from '@/features/patient/components/account-hero';

/** IA: 11. Notifications. */
export default function NotificationsPage() {
  return (
    <>
      <AccountHero title="Notifications" subtitle="Stay updated with your appointments, schedule, and important activities." />
      <div className="mx-auto max-w-3xl px-5 py-10 lg:py-12">
        <NotificationList />
      </div>
    </>
  );
}
