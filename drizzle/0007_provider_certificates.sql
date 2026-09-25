ALTER TABLE "providers" ADD COLUMN "certificate_media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Backfill: until now the chosen certificates were recorded only on the
-- approved application. Row-level security is forced on these tables, even for
-- the owner running this, so the copy runs as the system actor and resets after.
SELECT set_config('app.actor_kind', 'system', false);--> statement-breakpoint
UPDATE "providers" p SET "certificate_media_ids" = coalesce((
  SELECT jsonb_agg(c->'media_id')
  FROM "onboarding_sessions" o
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(o."draft"->'photo_uploads'->'certificates') = 'array'
      THEN o."draft"->'photo_uploads'->'certificates' ELSE '[]'::jsonb END
  ) c
  WHERE o."user_id" = p."user_id" AND o."status" = 'approved' AND c ? 'media_id'
), '[]'::jsonb)
WHERE p."user_id" IS NOT NULL;--> statement-breakpoint
SELECT set_config('app.actor_kind', '', false);
