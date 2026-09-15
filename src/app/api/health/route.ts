
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();

  try {
    const { db } = await import('@/server/db/client');

    const rows = await db.execute<{ db: string; usr: string; tables: number }>(sql`
      select current_database() as db,
             current_user as usr,
             (select count(*)::int from pg_class c
                join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relkind = 'r') as tables`);

    const row = rows[0];

    return NextResponse.json({
      status: 'ok',
      database: {
        connected: true,
        name: row?.db ?? null,
        user: row?.usr ?? null,
        tables: row?.tables ?? 0,
        latencyMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        database: {
          connected: false,
          error: describe(error),
          latencyMs: Date.now() - startedAt,
        },
      },
      { status: 503 },
    );
  }
}


function describe(error: unknown): string {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    const next = (current as { cause?: unknown } | null)?.cause;
    if (!next) break;
    current = next;
  }
  const err = current as { code?: string; message?: string };
  return [err?.code, err?.message].filter(Boolean).join(' ') || String(current);
}
