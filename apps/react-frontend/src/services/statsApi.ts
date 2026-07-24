import { apiRequest } from './apiClient';

// Public headline counts for the landing hero (backend SiteStatsResponse). All three come from our
// own database — reviews and accounts — not from IGDB.
export type SiteStats = {
  titlesReviewed: number;
  retrospectives: number;
  members: number;
};

/** GET /api/stats — anonymous endpoint, so the signed-out landing page can call it. */
function getSiteStats(): Promise<SiteStats> {
  return apiRequest<SiteStats>('/api/stats');
}

export const statsApi = { getSiteStats };
