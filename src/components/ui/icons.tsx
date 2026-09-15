import type { ReactNode } from 'react';

/**
 * Every line icon the product uses, in one place.
 *
 * There used to be three sets -- one inside `field.tsx`, one for the patient
 * dashboard, one for booking -- and they had already drifted: three calendars,
 * two pins, and the same stethoscope under two names. One module means a glyph
 * is decided once.
 *
 * Every icon takes a `className` and defaults to the 18px the form fields were
 * drawn at. Anything smaller says so where it is used.
 *
 * All of them are decorative. The text beside an icon carries the meaning, and
 * a screen reader announcing an image before every label is noise.
 */

interface IconProps {
  className?: string;
}

const DEFAULT_SIZE = 'h-[1.125rem] w-[1.125rem]';

function Stroked({ className = DEFAULT_SIZE, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// --- people and contact ----------------------------------------------------

export const UserIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M10 10a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM4 16.5c0-2.6 2.7-4.2 6-4.2s6 1.6 6 4.2" />
  </Stroked>
);

export const MailIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
    <path d="m3 6 7 4.5L17 6" />
  </Stroked>
);

export const PhoneIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M6.2 3h-1A2.2 2.2 0 0 0 3 5.2C3 11.2 8.8 17 14.8 17a2.2 2.2 0 0 0 2.2-2.2v-1l-3.2-1.4-1.5 1.8a11 11 0 0 1-4.5-4.5l1.8-1.5L6.2 3Z" />
  </Stroked>
);

export const GenderIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="8.5" cy="11.5" r="4" />
    <path d="M12 8 16.5 3.5M13 3.5h3.5V7" />
  </Stroked>
);

export const PersonCardIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <rect x="2.5" y="4" width="15" height="12" rx="2" />
    <circle cx="7.5" cy="9" r="1.8" />
    <path d="M4.6 13.4c.4-1.2 1.6-1.9 2.9-1.9s2.5.7 2.9 1.9M12.5 8.5h3.2M12.5 11.5h3.2" />
  </Stroked>
);

export const DependentsIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="7.4" cy="7.6" r="2.6" />
    <path d="M2.8 15.5c0-2.2 2-3.5 4.6-3.5s4.6 1.3 4.6 3.5" />
    <path d="M13.6 5.4a2.4 2.4 0 0 1 0 4.6M14.6 12.3c1.6.3 2.7 1.3 2.7 3.2" />
  </Stroked>
);

export const ChatIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M4 4.5h12a1.5 1.5 0 0 1 1.5 1.5v6.5A1.5 1.5 0 0 1 16 14H9l-3.5 3v-3H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5Z" />
    <path d="M6.5 8.3h7M6.5 10.8h4.5" />
  </Stroked>
);

// --- security ----------------------------------------------------------------

export const LockIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <rect x="4" y="8.5" width="12" height="8" rx="2" />
    <path d="M7 8.5V6.6a3 3 0 0 1 6 0v1.9" />
  </Stroked>
);

export const LogoutIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M12.5 6V4.5a1.5 1.5 0 0 0-1.5-1.5H5a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 5 17h6a1.5 1.5 0 0 0 1.5-1.5V14" />
    <path d="M8.5 10h8M14 7.5l2.5 2.5L14 12.5" />
  </Stroked>
);

// --- places and time ---------------------------------------------------------

export const CalendarIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <rect x="3" y="4.5" width="14" height="12" rx="2" />
    <path d="M3 8h14M7 3v3M13 3v3" />
  </Stroked>
);

export const ClockIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4.2l2.6 1.6" />
  </Stroked>
);

export const PinIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M10 17s5.2-4.4 5.2-8.2a5.2 5.2 0 1 0-10.4 0C4.8 12.6 10 17 10 17Z" />
    <circle cx="10" cy="8.6" r="1.9" />
  </Stroked>
);

export const GlobeIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="10" cy="10" r="7.2" />
    <path d="M2.8 10h14.4M10 2.8c4 4.4 4 10 0 14.4-4-4.4-4-10 0-14.4Z" />
  </Stroked>
);

export const ScreenIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <rect x="2.5" y="4" width="15" height="10" rx="2" />
    <path d="M7 17h6" />
  </Stroked>
);

// --- care --------------------------------------------------------------------

export const StethoscopeIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M5 2.5v4a3.2 3.2 0 0 0 6.4 0v-4" />
    <path d="M8.2 9.7v2.6a4 4 0 0 0 8 0v-1.1" />
    <circle cx="16.2" cy="9.4" r="1.7" />
  </Stroked>
);

export const ToothIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M6.2 2.8c1.3 0 1.6.7 3.8.7s2.5-.7 3.8-.7c1.6 0 2.7 1.3 2.7 3.3 0 2.6-1.1 3.6-1.6 6.2-.4 2.1-.6 4.7-1.9 4.7-1.1 0-1.2-2.2-1.6-4-.3-1.3-.6-1.9-1.4-1.9s-1.1.6-1.4 1.9c-.4 1.8-.5 4-1.6 4-1.3 0-1.5-2.6-1.9-4.7C4.6 9.7 3.5 8.7 3.5 6.1c0-2 1.1-3.3 2.7-3.3Z" />
  </Stroked>
);

export const ClipboardIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <rect x="4" y="3.8" width="12" height="13.4" rx="2" />
    <path d="M7.5 3.8V2.6h5v1.2M7.6 9.4h4.8M7.6 12.6h3.2" />
  </Stroked>
);

export const EyeIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M1.8 10S4.9 4.8 10 4.8 18.2 10 18.2 10 15.1 15.2 10 15.2 1.8 10 1.8 10Z" />
    <circle cx="10" cy="10" r="2.4" />
  </Stroked>
);

export const ProgressIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M3 16.5h14M6 16.5v-5M10 16.5V6.5M14 16.5v-7.5" />
  </Stroked>
);

export const HeartIcon = ({ className = DEFAULT_SIZE, filled = false }: IconProps & { filled?: boolean }) => (
  <svg
    viewBox="0 0 20 20"
    className={className}
    aria-hidden="true"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 16.5S3.3 12.4 3.3 7.9a3.6 3.6 0 0 1 6.7-1.8 3.6 3.6 0 0 1 6.7 1.8c0 4.5-6.7 8.6-6.7 8.6Z" />
  </svg>
);

export const StarIcon = ({ className = DEFAULT_SIZE }: IconProps) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
    <path d="m10 2.6 2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1L2.5 8.1l5.2-.8Z" />
  </svg>
);

// --- state -------------------------------------------------------------------

export const CheckIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="m5 10.4 3.4 3.4L15 7" />
  </Stroked>
);

export const CheckCircleIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="10" cy="10" r="7" />
    <path d="m6.8 10.2 2.1 2.1 4.3-4.3" />
  </Stroked>
);

export const AlertClockIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6.2v4.3M10 13.4v.1" />
  </Stroked>
);

export const QuestionIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="10" cy="10" r="7.2" />
    <path d="M8.1 8a2 2 0 1 1 2.6 1.9c-.5.2-.7.6-.7 1.1v.4M10 14v.1" />
  </Stroked>
);

export const CrossIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
  </Stroked>
);

// --- actions -----------------------------------------------------------------

export const SearchIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13.2 13.2 3.3 3.3" />
  </Stroked>
);

export const UploadIcon = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M10 13.5V3.8M6.6 7.2 10 3.8l3.4 3.4M3.5 13v2.2a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V13" />
  </Stroked>
);

export const ArrowRight = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5" />
  </Stroked>
);

export const ChevronRight = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="m8 5 5 5-5 5" />
  </Stroked>
);

export const ChevronLeft = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="m12 5-5 5 5 5" />
  </Stroked>
);

export const ChevronDown = ({ className }: IconProps) => (
  <Stroked className={className}>
    <path d="m6 8 4 4 4-4" />
  </Stroked>
);
