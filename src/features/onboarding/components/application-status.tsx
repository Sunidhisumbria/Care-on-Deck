import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';

import type { OnboardingSession } from '../types';

type ClosedStatus = 'submitted' | 'approved' | 'rejected';

const COPY: Record<ClosedStatus, { tone: StatusTone; badge: string; title: string; body: string }> = {
  submitted: {
    tone: 'warning',
    badge: 'Under review',
    title: 'Your application is under review',
    body: 'Our team checks every application before a provider can be listed. We will email you when a decision has been made.',
  },
  approved: {
    tone: 'success',
    badge: 'Approved',
    title: 'Your application has been approved',
    body: 'Your practice is live. Taking you to your dashboard…',
  },
  rejected: {
    tone: 'danger',
    badge: 'Not approved',
    title: 'Your application was not approved',
    body: 'Contact support if you would like to discuss this decision.',
  },
};

export function isClosed(status: OnboardingSession['status']): status is ClosedStatus {
  return status === 'submitted' || status === 'approved' || status === 'rejected';
}

/**
 * What an applicant sees once the application is out of their hands.
 *
 * There are no designs for these states yet. They exist now so that routing is
 * complete -- a signed-in provider always lands somewhere that says where they
 * stand -- and will be restyled when the designs arrive.
 */
export function ApplicationStatus({ session }: { session: OnboardingSession & { status: ClosedStatus } }) {
  const copy = COPY[session.status];

  return (
    <div className="mx-auto mt-4 max-w-md rounded-card border border-line bg-white p-8 text-center">
      <StatusBadge tone={copy.tone}>{copy.badge}</StatusBadge>
      <h1 className="mt-4 text-xl font-extrabold text-ink-900">{copy.title}</h1>
      <p className="mt-2 text-sm text-ink-500">{copy.body}</p>
      {session.reviewer_note ? (
        <p className="mt-4 rounded-field bg-canvas px-4 py-3 text-left text-sm text-ink-700">
          {session.reviewer_note}
        </p>
      ) : null}
    </div>
  );
}
