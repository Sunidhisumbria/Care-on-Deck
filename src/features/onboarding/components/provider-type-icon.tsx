import { ChatIcon, QuestionIcon, StethoscopeIcon, ToothIcon } from '@/components/ui/icons';

import type { ProviderType } from '../types';

/**
 * One glyph per provider type.
 *
 * The designs use full-colour illustrations here. These line icons hold the
 * place until those assets are exported -- same size, same position, swapped
 * in this one file.
 */
export function ProviderTypeIcon({ type }: { type: ProviderType }) {
  switch (type) {
    case 'physician':
      return <StethoscopeIcon />;
    case 'dentist':
      return <ToothIcon />;
    case 'therapist':
      return <ChatIcon />;
    case 'nurse_practitioner':
      return <NurseIcon />;
    default:
      return <QuestionIcon />;
  }
}

/** Specific to this list, so it lives here rather than in the shared set. */
function NurseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-[1.125rem] w-[1.125rem]"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6.2c0-2.3 1.8-3.7 4-3.7s4 1.4 4 3.7Z" />
      <path d="M10 3.6v1.6M9.2 4.4h1.6" />
      <circle cx="10" cy="9.4" r="2.6" />
      <path d="M4.5 17c.3-2.7 2.7-4.4 5.5-4.4s5.2 1.7 5.5 4.4" />
    </svg>
  );
}
