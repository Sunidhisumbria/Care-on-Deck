/**
 * The public insurance directory.
 *
 * Carriers are platform reference data, curated by CareOndeck staff in Control
 * Center and readable by anyone: a patient filtering search results needs them
 * as much as a provider choosing what their practice accepts.
 *
 * IA: 14. Control Center > Insurance Directory
 */
import { asc, eq } from 'drizzle-orm';

import { insuranceCarriers } from '@/server/db/schema';
import type { Tx } from '@/server/db/tenant';

export interface CarrierSummary {
  id: string;
  name: string;
  slug: string;
}

export const insuranceService = {
  /** Active carriers, alphabetically. */
  async listCarriers(tx: Tx): Promise<CarrierSummary[]> {
    return tx
      .select({ id: insuranceCarriers.id, name: insuranceCarriers.name, slug: insuranceCarriers.slug })
      .from(insuranceCarriers)
      .where(eq(insuranceCarriers.isActive, true))
      .orderBy(asc(insuranceCarriers.name));
  },
};
