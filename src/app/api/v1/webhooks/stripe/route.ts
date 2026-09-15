
import { NextResponse } from 'next/server';

import { webhookService } from '@/server/modules/webhooks/webhook.service';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await webhookService.receive('stripe', rawBody, request.headers);
  return NextResponse.json({ received: result.accepted }, { status: result.status });
}
           