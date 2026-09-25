import { Illustration, type IllustrationName } from '@/components/ui/illustration';

import type { ProviderType } from '../types';

const ILLUSTRATION: Record<ProviderType, IllustrationName> = {
  physician: 'providerPhysician',
  dentist: 'providerDentist',
  therapist: 'providerTherapist',
  nurse_practitioner: 'providerNurse',
  other: 'providerOther',
};

/**
 * One full-colour illustration per provider type, exported from the design.
 * They carry their own colour, so the card shows them without a tinted frame.
 */
export function ProviderTypeIcon({ type }: { type: ProviderType }) {
  return <Illustration name={ILLUSTRATION[type]} className="h-10 w-10" />;
}
