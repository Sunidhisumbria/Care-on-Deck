/**
 * POST /api/v1/webhooks/postmark
 *
 * Email bounces and spam complaints; feeds the suppression list.
 *
 * Webhooks bypass defineRoute: the signature is computed over the raw body, so
 * nothing may parse or re-serialise it first. The handler verifies, persists to
 * `webhook_events` keyed on the vendor's event id, and returns 200 quickly --
 * processing happens out of band so a slow handler cannot cause a retry storm.
 */
import { NextResponse } from 'next/server';

import { webhookService } from '@/server/modules/webhooks/webhook.service';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await webhookService.receive('postmark', rawBody, request.headers);
  return NextResponse.json({ received: result.accepted }, { status: result.status });
}
