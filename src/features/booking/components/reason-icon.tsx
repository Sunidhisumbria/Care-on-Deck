import { Illustration, type IllustrationName } from '@/components/ui/illustration';
import { iconForVisitReason, type VisitReasonIcon } from '@/lib/visit-reasons';

const ILLUSTRATION: Record<VisitReasonIcon, IllustrationName> = {
  checkup: 'reasonCheckup',
  cold: 'reasonCold',
  chronic: 'reasonChronic',
  skin: 'reasonSkin',
  other: 'reasonOther',
};

/**
 * One full-colour icon per visit reason, from the Figma export, so the list
 * reads at a glance.
 *
 * Practices name their own reasons, so the icon is matched from the name --
 * see iconForVisitReason. A practice that invents "Sports Physical" gets the
 * neutral icon rather than nothing.
 */
export function ReasonIcon({ reason, className }: { reason: string; className?: string }) {
  return <Illustration name={ILLUSTRATION[iconForVisitReason(reason)]} className={className} />;
}
