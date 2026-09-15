import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { ReactNode } from "react";

type IconName =
  | "search"
  | "pin"
  | "shield"
  | "chevron"
  | "arrow"
  | "bell"
  | "users"
  | "tooth"
  | "heart"
  | "stethoscope"
  | "calendar"
  | "clock"
  | "star"
  | "check"
  | "play"
  | "close"
  | "eye"
  | "cursor"
  | "doctor"
  | "menu"
  | "consultation";
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8.5 11.5 2.5 2.5 4.5-5" />
      </>
    ),
    chevron: <path d="m9 5 7 7-7 7" />,
    arrow: <path d="M3 12h17m-5-5 5 5-5 5" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 5-2 7-2 7h16s-2-2-2-7M10 19h4" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2M6 13l3 3 3-3" />
      </>
    ),
    tooth: (
      <path d="M12 5C6 1 3 5 5 11c1 3 1 10 4 10 2 0 1-7 3-7s1 7 3 7c3 0 3-7 4-10 2-6-1-10-7-6Zm0 0 3 2" />
    ),
    heart: (
      <>
        <path d="M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13Z" />
        <path d="M12 6v13" />
      </>
    ),
    stethoscope: (
      <>
        <path d="M5 3v5a5 5 0 0 0 10 0V3M3 3h4m6 0h4M10 13v3a5 5 0 0 0 10 0v-3" />
        <circle cx="20" cy="10" r="2" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v5m10-5v5M3 11h18M7 15h2m3 0h2m3 0h1M7 18h2m3 0h2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />,
    check: (
      <>
        <path d="m12 2 3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1 3-2Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    play: <path d="m9 5 11 7-11 7V5Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
        <circle cx="12" cy="12" r="5" />
        <path d="M12 9v6m-3-3h6M12 1v1m0 20v1M3 3l2 2m14 14 2 2M21 3l-2 2M5 19l-2 2" />
      </>
    ),
    cursor: (
      <>
        <rect x="2" y="2" width="18" height="18" rx="1" />
        <path d="M2 6h18M5 4h1m2 0h1m2 0h1m0 6 3 13 3-4 4-2-10-7ZM8 10 6 8m4 1V7m-3 5H5" />
      </>
    ),
    doctor: (
      <>
        <circle cx="11" cy="5" r="4" />
        <path d="M2 20v-4a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1M2 20h8m1-4 3 6 3-10 3 8h3" />
      </>
    ),
    consultation: (
      <>
        <circle cx="15" cy="5" r="3" />
        <path d="M11 13V9l4-1 4 1v6M13 9l2 3 2-3M15 12v3M19 12h3v6H10M3 16v-3a3 3 0 0 1 6 0v3M1 22v-4a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v4H1ZM13 21h9M4 4h4M6 2v4" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  };
  return (
    <svg
      className={"lp-icon " + className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Wordmark() {
  return <Link className="lp-wordmark" href="/" aria-label="CareOndeck home"><Logo /></Link>;
}

export function DoctorAvatar({ badge = false }: { badge?: boolean }) {
  return (
    <span className="lp-avatar">
      <svg viewBox="0 0 80 80" role="img" aria-label="Illustrated doctor">
        <circle cx="40" cy="40" r="39" fill="#f3e8ef" />
        <path d="M22 52C8 38 20 9 38 8c24-4 29 24 20 44Z" fill="#242646" />
        <path d="M10 78c0-21 15-30 30-30s30 9 30 30" fill="#fff" />
        <path d="m33 45-1 11 8 10 9-10-2-12" fill="#edb18b" />
        <path
          d="M25 24c0 16 5 26 15 26s16-13 16-25c-11 1-19-8-19-8s-2 7-12 7Z"
          fill="#ffd1a6"
        />
        <path
          d="m30 53 10 13-6 14-12-23 8-4Zm20 0L40 66l6 14 12-23-8-4Z"
          fill="#dae4f7"
        />
        <path d="m37 64 3 2 3-2 2 16H35Z" fill="#5a8dca" />
        <path
          d="M28 56c-4 8-4 12-1 16m25-16c4 9 4 15-1 18"
          fill="none"
          stroke="#55578c"
          strokeWidth="2"
        />
        <circle
          cx="51"
          cy="73"
          r="3"
          fill="#fff"
          stroke="#55578c"
          strokeWidth="2"
        />
        <path
          d="M25 72h5"
          stroke="#55578c"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {badge && (
        <span className="lp-avatar-badge">
          <Icon name="shield" />
        </span>
      )}
    </span>
  );
}
