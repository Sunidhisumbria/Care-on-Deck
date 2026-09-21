import { apiGet, apiPost } from '@/lib/http/client';

import type {
  BookingConfirmation,
  BookingRequest,
  ProviderAvailability,
  ProviderSearchFilters,
  ProviderSearchResult,
  VisitReasonOption,
} from '../types';


export const bookingApi = {
  searchProviders: (filters: ProviderSearchFilters) =>
    apiGet<ProviderSearchResult>('/marketplace/search', { ...filters }),

  availability: (providerId: string, from: string, to: string) =>
    apiGet<ProviderAvailability>('/marketplace/availability', {
      provider_id: providerId,
      from,
      to,
    }),

  visitReasons: (providerId: string) =>
    apiGet<VisitReasonOption[]>('/booking/visit-reasons', { provider_id: providerId }),

  requestBooking: (body: BookingRequest) =>
    apiPost<BookingConfirmation>('/booking/requests', body),
};

