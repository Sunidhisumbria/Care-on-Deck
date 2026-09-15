import Image from 'next/image';
import type { ReactNode } from 'react';

/** Decorative product previews shared by the authentication screens. */
export function BrandPanel() {
  return (
    <aside className="auth-brand">
      <div className="auth-facets" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="auth-brand-copy">
        <h2>Better Care,<br />Better Life</h2>
        <p>Connect with trusted doctors, book appointments,<br className="auth-copy-break" /> and manage your health - all in one place</p>
      </div>
      <div className="auth-previews" aria-hidden="true">
        <Preview className="specialist-preview" title="Find Your Specialist" body="Search doctors by specialty, experience & location.">
          <div className="preview-search"><Glyph kind="search" /><span>Search doctors or specialties</span><b><Glyph kind="search" /></b></div>
          <div className="preview-specialties">
            {['Cardiologist', 'Dermatologist', 'Pediatrician', 'Dentist'].map((name, i) => <div key={name}><span><Glyph kind={i === 0 ? 'heart' : i === 3 ? 'tooth' : 'person'} /></span><small>{name}</small></div>)}
          </div>
        </Preview>
        <Preview className="doctor-preview" title="Trusted Doctors" body="Verified profiles and real patient reviews.">
          <div className="preview-doctor"><Image src="/images/landing/doctor-woman.jpg" alt="" width={58} height={64} /><div><strong>Dr. Sarah Johnson</strong><span>Cardiologist</span><small><b>★</b> 4.8 <em>(120 reviews)</em></small></div></div>
          <div className="preview-avatars">{['doctor-woman', 'doctor-man', 'doctor-young', 'doctor-clinic'].map((name) => <Image key={name} src={'/images/landing/' + name + '.jpg'} alt="" width={30} height={30} />)}<b>120+</b></div>
          <p className="preview-patients">Happy Patients</p>
        </Preview>
        <Preview className="calendar-preview" title="Easy Appointments" body="Book appointments in just a few clicks.">
          <div className="preview-calendar"><div className="calendar-heading"><span>‹</span><strong>June 2025</strong><span>›</span></div><div className="calendar-grid">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => <small key={day}>{day}</small>)}{Array.from({ length: 30 }, (_, i) => <span className={i === 17 ? 'selected-day' : ''} key={i}>{i + 1}</span>)}</div></div>
        </Preview>
        <Preview className="records-preview" title="Health Records" body="Keep all your prescriptions and reports safe.">
          <div className="preview-record"><span><Glyph kind="record" /></span><div><strong>Blood Report</strong><small>12 May 2025</small></div><Glyph kind="download" /></div>
          <div className="preview-record prescription"><span><Glyph kind="record" /></span><div><strong>Prescription</strong><small>08 May 2025</small></div><Glyph kind="download" /></div>
          <div className="preview-records-link">View All Records</div>
        </Preview>
      </div>
      <dl className="auth-stats">
        <Stat kind="person" value="10k+" label="Trusted Doctors" />
        <Stat kind="calendar" value="50k+" label="Appointments" />
        <Stat kind="heart" value="100k+" label="Happy Patients" />
      </dl>
    </aside>
  );
}
function Preview({ title, body, className, children }: { title: string; body: string; className: string; children: ReactNode }) {
  return <div className={'auth-preview ' + className}><h3>{title}</h3><p>{body}</p>{children}</div>;
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

