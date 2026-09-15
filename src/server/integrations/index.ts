/**
 * Adapters for everything in IA 15. External Services.
 *
 * Every vendor sits behind an interface defined here, so feature code never
 * imports a vendor SDK directly. Three things follow from that rule: a vendor
 * can be swapped (Postmark for SES) without touching a service, tests get a
 * hand-written fake instead of network mocking, and each adapter is the one
 * place that records its own usage event for metering.
 *
 * An adapter with no credentials throws IntegrationNotConfiguredError up front
 * rather than failing halfway -- local development runs with most of these off.
 */

export * from './types';
export { meter, type UsageMeter } from './usage';

export { firebaseAuth, type FirebaseTokenClaims } from './firebase-auth';
export { stripe } from './stripe';
export { typesense, type SearchQuery, type ProviderDocument } from './typesense';
export { telnyx, type NumberLookupResult } from './telnyx';
export { postmark, type EmailMessage } from './postmark';
export { amazonSes } from './amazon-ses';
export { rekognition, type ModerationLabel } from './rekognition';
export { googleMaps, type PlaceSuggestion } from './google-maps';
export { nppes, type NpiRecord } from './nppes';
export { cloudinary } from './cloudinary';
export { fileStorage } from './file-storage';
export { openDental, type OpenDentalAppointment } from './opendental';
