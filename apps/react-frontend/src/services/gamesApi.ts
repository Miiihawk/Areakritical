import type { Review } from './reviewsApi';

const API_BASE_URL = '/api/games';

export class GamesApiError extends Error {}

export type Game = {
  id: number;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  releaseYear: number | null;
  age: number | null;
  systemRequirements: string | null;
  genres: string[];
  developer: string | null;
  publisher: string | null;
};

// The game detail payload (backend GameDetailResponse): the game's own fields plus its aggregate
// score and one page of reviews. `aggregateScore` is null when there are no reviews yet.
export type GameDetail = Game & {
  aggregateScore: number | null;
  reviewCount: number;
  reviews: Review[];
  page: number;
  pageSize: number;
  // Feature 003 (retro-only reviews): whether a new review may be created for this game right now
  // (it must be at least 5 years old), and when it becomes/became eligible (release + 5 years; null
  // when the release date is unknown — in which case isEligibleForReview is false too).
  isEligibleForReview: boolean;
  reviewEligibleAtUtc: string | null;
};

async function get<TResponse>(path: string, token: string | null): Promise<TResponse> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new GamesApiError('Cannot reach the server. Make sure the API is running.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody && typeof errorBody.message === 'string'
        ? errorBody.message
        : 'Request failed.';
    throw new GamesApiError(message);
  }

  return (await response.json()) as TResponse;
}

// One row of the community leaderboard (backend GameRankingResponse).
export type GameRanking = {
  id: number;
  title: string;
  coverImageUrl: string | null;
  releaseYear: number | null;
  aggregateScore: number;
  reviewCount: number;
  // IGDB genre tags, for the library's "Highest Rated" cards (which render from this leaderboard).
  genres: string[];
};

// Catalogue orderings understood by the backend. "popular" = how widely known a game is; actual
// score-based sorting ("Highest Rated") happens client-side using OUR database's rankings.
export type BrowseSort = 'popular' | 'newest' | 'oldest' | 'name';

function search(query: string, token: string | null): Promise<Game[]> {
  return get<Game[]>(`?search=${encodeURIComponent(query)}`, token);
}

export type BrowseFilters = {
  platform?: string | null;
  genre?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
};

/** Shared query string for the browse + browse/count endpoints (sort + optional filters). */
function browseParams(sort: BrowseSort, filters: BrowseFilters): URLSearchParams {
  const params = new URLSearchParams({ sort });
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.yearFrom != null) params.set('yearFrom', String(filters.yearFrom));
  if (filters.yearTo != null) params.set('yearTo', String(filters.yearTo));
  return params;
}

/**
 * GET /api/games/browse — the curated catalogue (no search term), with sort + optional filters.
 * `page` (1-based) walks the whole catalogue; callers that don't paginate (e.g. the dashboard rows)
 * just take page 1.
 */
function browse(
  sort: BrowseSort,
  filters: BrowseFilters,
  token: string | null,
  page = 1,
): Promise<Game[]> {
  const params = browseParams(sort, filters);
  if (page > 1) params.set('page', String(page));
  return get<Game[]>(`/browse?${params.toString()}`, token);
}

/** GET /api/games/browse/count — total games matching these filters, for numbered pagination. */
function browseCount(
  sort: BrowseSort,
  filters: BrowseFilters,
  token: string | null,
): Promise<number> {
  return get<{ totalCount: number }>(`/browse/count?${browseParams(sort, filters).toString()}`, token).then(
    (result) => result.totalCount,
  );
}

/** GET /api/games/rankings — reviewed games ordered by aggregate score, best first. */
function rankings(token: string | null): Promise<GameRanking[]> {
  return get<GameRanking[]>('/rankings', token);
}

/** GET /api/games/{id} — the full detail page payload, including a page of reviews. */
function getById(
  id: number,
  token: string | null,
  page = 1,
  pageSize = 20,
): Promise<GameDetail> {
  return get<GameDetail>(`/${id}?page=${page}&pageSize=${pageSize}`, token);
}

export const gamesApi = { search, getById, browse, browseCount, rankings };
