/** Campaigns & Analytics wire types. Snake_case, matching the API. */

export interface CampaignStats {
  spend_cents: number;
  clicks: number;
  requests: number;
  confirmed: number;
  cost_per_click_cents: number | null;
  cost_per_request_cents: number | null;
  cost_per_confirmed_cents: number | null;
}

export interface CampaignSummary extends CampaignStats {
  id: string;
  name: string;
  state: 'scheduled' | 'active' | 'ended';
  campaign_type: string | null;
  description: string | null;
  starts_on: string | null;
  ends_on: string | null;
  tracking_path: string | null;
}

export interface PulseOverview extends CampaignStats {
  active: CampaignSummary[];
}

export interface AgencySummary {
  id: string;
  name: string;
  agency_type: string | null;
  status: 'active' | 'inactive';
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  campaigns: number;
  last_activity_at: string | null;
}

export interface AgencyDetail extends AgencySummary {
  campaigns_list: Array<{ id: string; name: string; clicks: number; state: CampaignSummary['state'] }>;
  history: Array<{ kind: string; summary: string | null; occurred_at: string }>;
}
