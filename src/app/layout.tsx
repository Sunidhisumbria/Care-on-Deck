import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppProviders } from '@/components/providers/app-providers';

import './globals.css';

/**
 * Inter, self-hosted by next/font rather than pulled from Google at runtime.
 *
 * The <link> snippet Google hands out costs two DNS lookups and a
 * render-blocking stylesheet before the first character appears, and the font
 * file then arrives late enough to reflow the page under it. next/font
 * downloads the file at build time, serves it from our own origin, and inlines
 * the @font-face -- so there is no third-party request on the critical path,
 * and no layout shift when the real font lands.
 *
 * Variable font: every weight from 100 to 900 is available without pulling a
 * separate file per weight. `opsz` is Inter's optical-size axis, which the
 * browser drives from the font size -- tighter spacing in headings, looser in
 * body text. Declaring the axis is what makes `font-optical-sizing: auto`
 * (the CSS default) actually have something to act on.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  axes: ['opsz'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'CareOndeck',
  description: 'Find the right doctor. On your schedule.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
