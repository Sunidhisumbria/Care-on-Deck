/**
 * US states, DC and the inhabited territories: two-letter codes, names, and
 * each one's primary time zone.
 *
 * Shared by every screen that asks for a state -- a patient's address, the
 * state that issued a provider's license, where a practice is. Territories are
 * included because they license clinicians and are home to patients too; a list
 * missing someone's jurisdiction is a form they cannot finish.
 *
 * The time zone is the one most of the state keeps. About a dozen states span
 * two -- the Florida panhandle, El Paso, western Kentucky -- so it is a sensible
 * default for a new practice, not a fact; a practice on the other side of the
 * line corrects it in its facility settings.
 */
export const US_STATES = [
  { code: 'AL', name: 'Alabama', timezone: 'America/Chicago' },
  { code: 'AK', name: 'Alaska', timezone: 'America/Anchorage' },
  { code: 'AZ', name: 'Arizona', timezone: 'America/Phoenix' },
  { code: 'AR', name: 'Arkansas', timezone: 'America/Chicago' },
  { code: 'CA', name: 'California', timezone: 'America/Los_Angeles' },
  { code: 'CO', name: 'Colorado', timezone: 'America/Denver' },
  { code: 'CT', name: 'Connecticut', timezone: 'America/New_York' },
  { code: 'DE', name: 'Delaware', timezone: 'America/New_York' },
  { code: 'DC', name: 'District of Columbia', timezone: 'America/New_York' },
  { code: 'FL', name: 'Florida', timezone: 'America/New_York' },
  { code: 'GA', name: 'Georgia', timezone: 'America/New_York' },
  { code: 'HI', name: 'Hawaii', timezone: 'Pacific/Honolulu' },
  { code: 'ID', name: 'Idaho', timezone: 'America/Boise' },
  { code: 'IL', name: 'Illinois', timezone: 'America/Chicago' },
  { code: 'IN', name: 'Indiana', timezone: 'America/Indiana/Indianapolis' },
  { code: 'IA', name: 'Iowa', timezone: 'America/Chicago' },
  { code: 'KS', name: 'Kansas', timezone: 'America/Chicago' },
  { code: 'KY', name: 'Kentucky', timezone: 'America/New_York' },
  { code: 'LA', name: 'Louisiana', timezone: 'America/Chicago' },
  { code: 'ME', name: 'Maine', timezone: 'America/New_York' },
  { code: 'MD', name: 'Maryland', timezone: 'America/New_York' },
  { code: 'MA', name: 'Massachusetts', timezone: 'America/New_York' },
  { code: 'MI', name: 'Michigan', timezone: 'America/Detroit' },
  { code: 'MN', name: 'Minnesota', timezone: 'America/Chicago' },
  { code: 'MS', name: 'Mississippi', timezone: 'America/Chicago' },
  { code: 'MO', name: 'Missouri', timezone: 'America/Chicago' },
  { code: 'MT', name: 'Montana', timezone: 'America/Denver' },
  { code: 'NE', name: 'Nebraska', timezone: 'America/Chicago' },
  { code: 'NV', name: 'Nevada', timezone: 'America/Los_Angeles' },
  { code: 'NH', name: 'New Hampshire', timezone: 'America/New_York' },
  { code: 'NJ', name: 'New Jersey', timezone: 'America/New_York' },
  { code: 'NM', name: 'New Mexico', timezone: 'America/Denver' },
  { code: 'NY', name: 'New York', timezone: 'America/New_York' },
  { code: 'NC', name: 'North Carolina', timezone: 'America/New_York' },
  { code: 'ND', name: 'North Dakota', timezone: 'America/Chicago' },
  { code: 'OH', name: 'Ohio', timezone: 'America/New_York' },
  { code: 'OK', name: 'Oklahoma', timezone: 'America/Chicago' },
  { code: 'OR', name: 'Oregon', timezone: 'America/Los_Angeles' },
  { code: 'PA', name: 'Pennsylvania', timezone: 'America/New_York' },
  { code: 'RI', name: 'Rhode Island', timezone: 'America/New_York' },
  { code: 'SC', name: 'South Carolina', timezone: 'America/New_York' },
  { code: 'SD', name: 'South Dakota', timezone: 'America/Chicago' },
  { code: 'TN', name: 'Tennessee', timezone: 'America/Chicago' },
  { code: 'TX', name: 'Texas', timezone: 'America/Chicago' },
  { code: 'UT', name: 'Utah', timezone: 'America/Denver' },
  { code: 'VT', name: 'Vermont', timezone: 'America/New_York' },
  { code: 'VA', name: 'Virginia', timezone: 'America/New_York' },
  { code: 'WA', name: 'Washington', timezone: 'America/Los_Angeles' },
  { code: 'WV', name: 'West Virginia', timezone: 'America/New_York' },
  { code: 'WI', name: 'Wisconsin', timezone: 'America/Chicago' },
  { code: 'WY', name: 'Wyoming', timezone: 'America/Denver' },
  { code: 'AS', name: 'American Samoa', timezone: 'Pacific/Pago_Pago' },
  { code: 'GU', name: 'Guam', timezone: 'Pacific/Guam' },
  { code: 'MP', name: 'Northern Mariana Islands', timezone: 'Pacific/Saipan' },
  { code: 'PR', name: 'Puerto Rico', timezone: 'America/Puerto_Rico' },
  { code: 'VI', name: 'U.S. Virgin Islands', timezone: 'America/St_Thomas' },
] as const;

export type UsStateCode = (typeof US_STATES)[number]['code'];

export const US_STATE_CODES = US_STATES.map((state) => state.code) as [UsStateCode, ...UsStateCode[]];

export function isUsStateCode(value: string | null | undefined): value is UsStateCode {
  return US_STATE_CODES.includes((value ?? '').toUpperCase() as UsStateCode);
}

/** For a select: "Florida (FL)". The code is what is stored. */
export function stateOptions(): Array<{ value: UsStateCode; label: string }> {
  return US_STATES.map((state) => ({ value: state.code, label: `${state.name} (${state.code})` }));
}

/** The state's primary IANA time zone. Eastern for anything unrecognised. */
export function timezoneForState(code: string): string {
  return US_STATES.find((state) => state.code === code.toUpperCase())?.timezone ?? 'America/New_York';
}
