import type { Route } from 'next';
import Link from 'next/link';

import { Logo } from '@/components/brand/logo';

/**
 * The public footer.
 *
 * Most of these are marketplace destinations that do not exist yet -- specialty
 * landing pages, plan pages. An entry with no `href` renders as plain text
 * rather than a link, because a footer full of 404s is worse than a footer
 * that is honest about what is live. Giving an entry a route is the only
 * change needed to turn it on.
 */
interface FooterLink {
  label: string;
  href?: Route;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
  /** Renders the "View All" affordance under the column. */
  viewAll?: boolean;
}

const COLUMNS: FooterColumn[] = [
  {
    title: 'Top Specialists',
    viewAll: true,
    links: [
      { label: 'Dentist' },
      { label: 'Pediatric Dentist' },
      { label: 'Dermatologist' },
      { label: 'Pediatrician' },
      { label: 'Family Doctor' },
      { label: 'Allergist/Immunologist' },
      { label: 'Pain Management Specialist' },
      { label: 'Gastroenterology' },
      { label: 'Hemorrhoid Specialist' },
    ],
  },
  {
    title: 'Cosmetic Dentistry',
    links: [
      { label: 'Teeth Whitening' },
      { label: 'Porcelain Veneers' },
      { label: 'Dental Implants' },
      { label: 'Invisalign®' },
      { label: 'Composite Bonding' },
      { label: 'Dental Crowns' },
      { label: 'Gum Contouring' },
    ],
  },
  {
    title: 'Cosmetic Doctors',
    links: [
      { label: 'Botox®' },
      { label: 'Dermal Fillers' },
      { label: 'Laser Resurfacing' },
      { label: 'IPL Photofacial' },
      { label: 'Chemical Peels' },
      { label: 'Microneedling' },
      { label: 'CoolSculpting®' },
      { label: 'Laser Hair Removal' },
    ],
  },
  {
    title: 'For Providers',
    links: [
      { label: 'Independent Practices', href: '/signup?role=doctor' },
      { label: 'New Practices', href: '/signup?role=doctor' },
      { label: 'Specialties' },
      { label: 'Multi-Location Groups' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Marketplace' },
      { label: 'CareOndeck Direct™' },
      { label: 'CareOndeck Pulse™' },
      { label: 'CareOndeck Connect™' },
      { label: 'Pricing' },
    ],
  },
  {
    title: 'About Us',
    links: [{ label: 'About CareOndeck' }, { label: 'FAQs' }, { label: 'Contact Us' }],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink-900 text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {COLUMNS.map((column) => (
            <Column key={column.title} column={column} />
          ))}
        </div>

        <div className="mt-14 space-y-6 border-t border-white/10 pt-10">
          <Disclaimer title="Informational disclaimer">
            The content on CareOndeck is for general informational and booking purposes only and
            does not provide medical advice, diagnosis, or treatment. Always consult your healthcare
            provider for personal medical questions.
          </Disclaimer>
          <Disclaimer title="Trademark disclaimer">
            All trademarks, service marks, trade names, logos, and brand names referenced on
            CareOndeck are the property of their respective owners. Their use is for identification
            and informational purposes only and does not imply affiliation with, sponsorship by, or
            endorsement of CareOndeck.
          </Disclaimer>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 py-7 lg:flex-row lg:justify-between lg:px-8">
          <Link href="/" aria-label="CareOndeck home">
            <Logo tone="light" />
          </Link>

          <p className="text-xs text-white/50">
            © {new Date().getFullYear()}. All rights reserved.
          </p>

          <nav className="flex items-center gap-6 text-xs text-white/70">
            <span>Sitemap</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </nav>

          <div className="flex items-center gap-3">
            <Social label="Facebook" path="M13.5 9H11V7.5c0-.6.4-.8.7-.8h1.7V4.3l-2.3-.01c-2.6 0-3.2 1.9-3.2 3.2V9H6.5v2.6h1.4V18h3v-6.4h2.1L13.5 9Z" />
            <Social label="Instagram" path="M10 6.9a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm0 5.1a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm4-5.3a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.4 3H5.6A2.6 2.6 0 0 0 3 5.6v8.8A2.6 2.6 0 0 0 5.6 17h8.8a2.6 2.6 0 0 0 2.6-2.6V5.6A2.6 2.6 0 0 0 14.4 3Zm1.5 11.4c0 .8-.7 1.5-1.5 1.5H5.6c-.8 0-1.5-.7-1.5-1.5V5.6c0-.8.7-1.5 1.5-1.5h8.8c.8 0 1.5.7 1.5 1.5v8.8Z" />
            <Social label="LinkedIn" path="M6 7.5H3.6V17H6V7.5ZM4.8 3a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM17 12.1c0-2.6-1.4-3.8-3.2-3.8-1.5 0-2.2.8-2.5 1.4V7.5H9v9.5h2.3v-5.3c0-1.1.6-1.7 1.5-1.7s1.5.6 1.5 1.7V17H17v-4.9Z" />
            <Social label="YouTube" path="M17.3 6.4a1.9 1.9 0 0 0-1.4-1.4C14.7 4.7 10 4.7 10 4.7s-4.7 0-5.9.3a1.9 1.9 0 0 0-1.4 1.4C2.4 7.6 2.4 10 2.4 10s0 2.4.3 3.6a1.9 1.9 0 0 0 1.4 1.4c1.2.3 5.9.3 5.9.3s4.7 0 5.9-.3a1.9 1.9 0 0 0 1.4-1.4c.3-1.2.3-3.6.3-3.6s0-2.4-.3-3.6ZM8.5 12.3V7.7l3.9 2.3-3.9 2.3Z" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function Column({ column }: { column: FooterColumn }) {
  return (
    <div>
      <h2 className="text-[0.6875rem] font-bold uppercase tracking-wider text-brand-500">
        {column.title}
      </h2>
      <ul className="mt-4 space-y-2.5">
        {column.links.map((link) => (
          <li key={link.label} className="text-[0.8125rem] leading-snug">
            {link.href ? (
              <Link href={link.href} className="text-white/80 transition-colors hover:text-white">
                {link.label}
              </Link>
            ) : (
              <span className="text-white/80">{link.label}</span>
            )}
          </li>
        ))}
      </ul>
      {column.viewAll ? (
        <p className="mt-4 text-[0.8125rem] font-medium text-brand-500">View All →</p>
      ) : null}
    </div>
  );
}

function Disclaimer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-white">{title}</h2>
      <p className="mt-1.5 max-w-4xl text-xs leading-relaxed text-white/60">{children}</p>
    </div>
  );
}

function Social({ label, path }: { label: string; path: string }) {
  return (
    <span
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    </span>
  );
}
