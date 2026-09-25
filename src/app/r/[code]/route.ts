/**
 * A campaign's tracking link: /r/{code}.
 *
 * Records the click, remembers the campaign for 30 days so a booking made in
 * that window is credited to it, and sends the visitor on to the campaign's
 * destination -- booking, filtered to the doctor. An unknown or retired link
 * goes to the home page and records nothing.
 *
 * The cookie holds only a campaign id: no patient data, nothing a page script
 * can read (httpOnly).
 */
import { randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { withSystem } from '@/server/db/tenant';
import { CAMPAIGN_COOKIE } from '@/server/modules/pulse/attribution';
import { pulseService } from '@/server/modules/pulse/pulse.service';

const VISITOR_COOKIE = 'cod_vid';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value ?? randomUUID();

  const click = /^[a-z0-9-]{3,24}$/.test(code)
    ? await withSystem({}, (tx) =>
        pulseService.recordClick(tx, code, {
          visitorId,
          referrer: request.headers.get('referer'),
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        }),
      ).catch(() => null)
    : null;

  // Only a path on this site is ever a destination.
  const destination = click && click.destination.startsWith('/') && !click.destination.startsWith('//') ? click.destination : '/';
  const response = NextResponse.redirect(new URL(destination, request.url));

  const cookie = { httpOnly: true, sameSite: 'lax' as const, secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: THIRTY_DAYS };
  response.cookies.set(VISITOR_COOKIE, visitorId, cookie);
  if (click) response.cookies.set(CAMPAIGN_COOKIE, click.campaignId, cookie);
  return response;
}
