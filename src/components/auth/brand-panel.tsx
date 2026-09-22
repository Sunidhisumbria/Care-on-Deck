import Image from 'next/image';
import type { ReactNode } from 'react';

/** Figma-aligned brand panel shared by the authentication screens. */
export function BrandPanel() {
  return (
    <aside className="auth-brand">
      <div className="auth-facets" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="auth-brand-copy">
        <h2>Focus on Patients,<br />We&apos;ll Handle the Rest</h2>
        <p>Manage your appointments, connect with patients,<br className="auth-copy-break" /> and grow your practice&mdash;all in one place</p>
      </div>
      <Image
        className="auth-brand-art"
        src="/images/auth-doctor-dashboard.webp"
        alt="Doctor managing patient care from a laptop"
        width={588}
        height={392}
        priority
      />
      <dl className="auth-stats">
        <Stat kind="person" value="10k+" label="Trusted Doctors" />
        <Stat kind="calendar" value="50k+" label="Appointments" />
        <Stat kind="heart" value="100k+" label="Happy Patients" />
      </dl>
    </aside>
  );
}
function Stat({ kind, value, label }: { kind: string; value: string; label: string }) {
  return <div><Glyph kind={kind} /><div><dt>{label}</dt><dd>{value}</dd></div></div>;
}
function Glyph({ kind }: { kind: string }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    person: <><circle cx="12" cy="7" r="4" /><path d="M4 22v-4a8 8 0 0 1 16 0v4M9 14l3 5 3-5M7 19v3m10-3v3" /></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-8.8 1 5.5 5.5 0 0 0-8.8-1C-1 9 4 15 12 22c8-7 13-13 8.8-17.4Z" /><path d="M2 12h5l2-5 4 10 2-5h7" /></>,
    tooth: <path d="M6 3c-5 1-3 8-1 11 1 2 0 7 3 7 2 0 1-7 4-7s2 7 4 7c3 0 2-5 3-7 2-3 4-10-1-11-3-1-4 1-6 1S9 2 6 3Z" />,
    calendar: <><rect x="2" y="4" width="20" height="18" rx="2" /><path d="M2 10h20M7 1v6m10-6v6M7 16l3 3 7-6" /></>,
    record: <><path d="M5 2h10l4 4v16H5zM15 2v5h4M9 11h6m-6 4h6m-6 3h4" /></>,
    download: <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

