import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import {
  GamesApiError,
  gamesApi,
  type BrowseSort,
  type Game,
  type GameRanking,
} from '../services/gamesApi';
import { SearchSuggest } from '../components/SearchSuggest';

// "rating" sorts by OUR community scores (from the rankings endpoint / Reviews table), never
// IGDB's. The other keys are simple catalogue orderings handled by the backend.
type SortKey = 'rating' | 'newest' | 'oldest' | 'name';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'rating', label: 'Highest Rated' },
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'name', label: 'Title A–Z' },
];

/** Maps a UI sort to the backend catalogue ordering — score sorting stays client-side (our DB). */
function toBrowseSort(sort: SortKey): BrowseSort {
  return sort === 'rating' ? 'popular' : sort;
}

/**
 * Projects a community-ranking row (from OUR /rankings endpoint) into the catalogue card shape so the
 * "Highest Rated" grid can render straight from our database's leaderboard. Fields IGDB would supply
 * but the ranking row omits (description/developer/publisher/…) aren't shown on the card, so null/empty
 * is fine; genres come through for the card's chips.
 */
function rankingToGame(entry: GameRanking): Game {
  return {
    id: entry.id,
    title: entry.title,
    description: null,
    coverImageUrl: entry.coverImageUrl,
    releaseYear: entry.releaseYear,
    age: null,
    systemRequirements: null,
    genres: entry.genres,
    developer: null,
    publisher: null,
  };
}

// How many catalogue cards fill one browse page. MUST match the backend's default browse pageSize
// (GamesController.Browse) so the total-count → page-count math lines up.
const PAGE_SIZE = 24;

/** The sliding window of page numbers to show around the current page (e.g. 4 5 [6] 7 8). */
function pageWindow(current: number, total: number, size = 5): number[] {
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(total, start + size - 1);
  start = Math.max(1, end - size + 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);
  return pages;
}

const PLATFORM_FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: 'All Platforms' },
  { key: 'pc', label: 'PC' },
  { key: 'playstation', label: 'PlayStation' },
  { key: 'xbox', label: 'Xbox' },
  { key: 'nintendo', label: 'Nintendo' },
  { key: 'retro', label: 'Retro' },
];

const GENRE_FILTERS: { key: string | null; label: string }[] = [
  { key: null, label: 'All Genres' },
  { key: 'rpg', label: 'RPG' },
  { key: 'shooter', label: 'Shooter' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'platformer', label: 'Platformer' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'racing', label: 'Racing' },
  { key: 'fighting', label: 'Fighting' },
  { key: 'puzzle', label: 'Puzzle' },
];

// Decade chips → year ranges for the backend's release-date filter.
const YEAR_FILTERS: { key: string | null; label: string; from?: number; to?: number }[] = [
  { key: null, label: 'All Years' },
  { key: '2020s', label: '2020s', from: 2020, to: 2029 },
  { key: '2010s', label: '2010s', from: 2010, to: 2019 },
  { key: '2000s', label: '2000s', from: 2000, to: 2009 },
  { key: '1990s', label: '1990s', from: 1990, to: 1999 },
  { key: '1980s', label: '1980s', from: 1980, to: 1989 },
];

/** Community-score tier shown as the card's right-hand badge, mirroring the reference. */
function tierFor(score: number | undefined): { label: string; className: string } {
  if (score === undefined) return { label: 'Unrated', className: 'tier--unrated' };
  if (score >= 9) return { label: 'Masterpiece', className: 'tier--masterpiece' };
  if (score >= 7) return { label: 'Acclaimed', className: 'tier--acclaimed' };
  return { label: 'Rated', className: 'tier--rated' };
}

/**
 * The Game Library. Opens straight into a browsable catalogue (no search required) with platform,
 * genre, and year filters; the community rankings are merged in so each card shows its review
 * score/count. The search box suggests matches live while typing; submitting switches the grid to
 * full search results.
 */
export function LibraryPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [platform, setPlatform] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [decade, setDecade] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [games, setGames] = useState<Game[]>([]);
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [rankingsLoaded, setRankingsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const hasActiveFilters = platform !== null || genre !== null || decade !== null;
  // The unfiltered "Highest Rated" view renders from our leaderboard (rankings), not the browse
  // catalogue — so it is neither paged nor counted via the browse endpoints.
  const isRatingLeaderboard = sort === 'rating' && mode === 'browse' && !hasActiveFilters;

  // Our community leaderboard, loaded once — keyed by game id for the card badges, and the direct
  // source for the "Highest Rated" grid (see shownGames).
  useEffect(() => {
    let active = true;
    setRankingsLoaded(false);
    gamesApi
      .rankings(token)
      .then((result) => {
        if (active) setRankings(result);
      })
      .catch(() => {
        /* Scores are decoration here; the catalogue still renders without them. */
      })
      .finally(() => {
        if (active) setRankingsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const rankById = useMemo(() => {
    const map = new Map<number, GameRanking>();
    for (const entry of rankings) {
      map.set(entry.id, entry);
    }
    return map;
  }, [rankings]);

  // Any change to the result SET (sort, filters, or leaving search) restarts paging at page 1.
  useEffect(() => {
    setPage(1);
  }, [mode, sort, platform, genre, decade]);

  // Browse mode: refetch the current page whenever the sort, a filter, or the page changes. The
  // unfiltered "Highest Rated" leaderboard renders from rankings instead, so it's skipped here.
  useEffect(() => {
    if (mode !== 'browse' || isRatingLeaderboard) {
      return;
    }
    let active = true;
    setIsLoading(true);
    setErrorMessage('');
    const yearRange = YEAR_FILTERS.find((entry) => entry.key === decade);
    gamesApi
      .browse(
        toBrowseSort(sort),
        { platform, genre, yearFrom: yearRange?.from, yearTo: yearRange?.to },
        token,
        page,
      )
      .then((result) => {
        if (active) setGames(result);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error instanceof GamesApiError ? error.message : 'Could not load games.');
        setGames([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, sort, platform, genre, decade, page, token, isRatingLeaderboard]);

  // Total match count for numbered pagination — refetched on filter/sort change, NOT on page change.
  useEffect(() => {
    if (mode !== 'browse' || isRatingLeaderboard) {
      setTotalCount(null);
      return;
    }
    let active = true;
    const yearRange = YEAR_FILTERS.find((entry) => entry.key === decade);
    gamesApi
      .browseCount(
        toBrowseSort(sort),
        { platform, genre, yearFrom: yearRange?.from, yearTo: yearRange?.to },
        token,
      )
      .then((count) => {
        if (active) setTotalCount(count);
      })
      .catch(() => {
        if (active) setTotalCount(null);
      });
    return () => {
      active = false;
    };
  }, [mode, sort, platform, genre, decade, token, isRatingLeaderboard]);

  // Jump back to the top of the archive when the page changes (a no-op on the initial page 1).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const runSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setMode('browse');
        return;
      }
      setMode('search');
      setSearchTerm(term);
      setIsLoading(true);
      setErrorMessage('');
      try {
        const results = await gamesApi.search(term, token);
        setGames(results);
      } catch (error) {
        setErrorMessage(error instanceof GamesApiError ? error.message : 'Search failed.');
        setGames([]);
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  // Arriving with ?q= (e.g. from the dashboard search box) runs that search once.
  const initialQuery = searchParams.get('q') ?? '';
  const didAutoSearch = useRef(false);
  useEffect(() => {
    if (initialQuery && !didAutoSearch.current) {
      didAutoSearch.current = true;
      void runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  // "Highest Rated" reflects OUR community leaderboard, sourced from our own database (the /rankings
  // endpoint), NEVER IGDB's popularity/rating. The unfiltered default view renders that leaderboard
  // directly — our top-rated games, best score first — so the catalogue's IGDB ordering can't leak in.
  // When the user narrows the catalogue (a filter) or searches, we order THAT set by our community
  // score instead (the narrowed set still comes from the server, but the ranking is always ours).
  const shownGames = useMemo(() => {
    if (sort === 'rating') {
      if (mode === 'browse' && !hasActiveFilters) {
        // The pure leaderboard: rated games only, already ordered best-first by our DB.
        return rankings.map(rankingToGame);
      }
      // Filtered catalogue or search results, re-ordered by our community score (reviewed games
      // first, best on top; unrated fall to the bottom in their existing order).
      return [...games].sort(
        (a, b) =>
          (rankById.get(b.id)?.aggregateScore ?? -1) - (rankById.get(a.id)?.aggregateScore ?? -1),
      );
    }
    if (mode === 'browse') {
      // The backend already ordered the catalogue for newest/oldest/name.
      return games;
    }
    // Search mode has no server ordering, so apply the simple catalogue sorts client-side.
    const copy = [...games];
    switch (sort) {
      case 'name':
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      case 'newest':
        return copy.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
      default:
        return copy.sort((a, b) => (a.releaseYear ?? Infinity) - (b.releaseYear ?? Infinity));
    }
  }, [games, mode, sort, rankById, rankings, hasActiveFilters]);

  // The unfiltered "Highest Rated" view renders from the leaderboard fetch, not the browse fetch, so
  // its loading/empty states must wait on rankings rather than the catalogue request.
  const isBusy = isRatingLeaderboard ? !rankingsLoaded : isLoading;

  // Numbered pagination applies only to the browse catalogue (not search, not the ≤50 leaderboard).
  const totalPages =
    totalCount != null ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;
  const showPager = mode === 'browse' && !isRatingLeaderboard && totalPages > 1;
  // The toolbar count reflects the whole matching catalogue when browsing, not just this page.
  const displayCount =
    mode === 'browse' && !isRatingLeaderboard && totalCount != null ? totalCount : shownGames.length;

  return (
    <div className="directory">
      <header className="directory__head">
        <h1 className="directory__title">Game Library</h1>
        <p className="directory__lede">
          Discover community ratings, read comprehensive breakdowns, and share your own reviews.
        </p>
      </header>

      <div className="directory__searchbar">
        <SearchSuggest
          placeholder="Search the archive for a title…"
          initialValue={initialQuery}
          onSubmit={(term) => void runSearch(term)}
          onClear={() => setMode('browse')}
        />
      </div>

      {/* Results toolbar — count, sort, and the Filters toggle, mirroring the reference. */}
      <div className="directory__toolbar">
        <p className="directory__count">
          Found <strong>{displayCount}</strong> indexed {displayCount === 1 ? 'title' : 'titles'}
          {mode === 'search' && ` for “${searchTerm}”`}
          {showPager && ` · page ${page} of ${totalPages}`}
        </p>
        <div className="directory__controls">
          <label className="directory__sort">
            <span aria-hidden="true">↕</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`directory__filters-btn ${showFilters || hasActiveFilters ? 'is-active' : ''}`}
            onClick={() => setShowFilters((open) => !open)}
          >
            <span aria-hidden="true">⚌</span> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="directory__filter-panel">
          <div className="directory__filter-group">
            <p className="directory__filter-label">Platform</p>
            <div className="directory__filter-chips">
              {PLATFORM_FILTERS.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  className={`platform ${platform === entry.key ? 'is-active' : ''}`}
                  onClick={() => {
                    setPlatform(entry.key);
                    // Filters apply to the catalogue, so leave search mode.
                    setMode('browse');
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="directory__filter-group">
            <p className="directory__filter-label">Genre</p>
            <div className="directory__filter-chips">
              {GENRE_FILTERS.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  className={`platform ${genre === entry.key ? 'is-active' : ''}`}
                  onClick={() => {
                    setGenre(entry.key);
                    setMode('browse');
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="directory__filter-group">
            <p className="directory__filter-label">Release Year</p>
            <div className="directory__filter-chips">
              {YEAR_FILTERS.map((entry) => (
                <button
                  key={entry.label}
                  type="button"
                  className={`platform ${decade === entry.key ? 'is-active' : ''}`}
                  onClick={() => {
                    setDecade(entry.key);
                    setMode('browse');
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="library__error">
          {errorMessage}
        </p>
      )}

      {isBusy && <p className="directory__status">Loading the archive…</p>}

      {!isBusy && !errorMessage && shownGames.length === 0 && (
        <p className="directory__status">
          {mode === 'search'
            ? `No titles found for “${searchTerm}”.`
            : isRatingLeaderboard
              ? 'No community scores yet — reviews power the leaderboard.'
              : 'No titles to show.'}
        </p>
      )}

      <ul className="series-grid">
        {shownGames.map((game) => {
          const rank = rankById.get(game.id);
          const tier = tierFor(rank?.aggregateScore);
          return (
            <li key={game.id} className="series-card">
              <Link to={`/games/${game.id}`} className="series-card__link">
                {game.coverImageUrl ? (
                  <img
                    className="series-card__cover"
                    src={game.coverImageUrl}
                    alt={`${game.title} cover`}
                    loading="lazy"
                  />
                ) : (
                  <div className="series-card__cover series-card__cover--empty">No cover</div>
                )}

                <div className="series-card__body">
                  <div className="series-card__badges">
                    <span className="series-badge series-badge--type">GAME</span>
                    <span className="series-badge series-badge--status">
                      {game.releaseYear ?? 'TBA'}
                    </span>
                    {game.genres.slice(0, 2).map((name) => (
                      <span key={name} className="series-badge series-badge--genre">{name}</span>
                    ))}
                  </div>
                  <h2 className="series-card__title">{game.title}</h2>
                  <div className="series-card__foot">
                    <span className="series-card__score">
                      <i aria-hidden="true">★</i>{' '}
                      {rank ? rank.aggregateScore.toFixed(1) : '—'}
                    </span>
                    <span className="series-card__comments">
                      <i aria-hidden="true">💬</i> {rank?.reviewCount ?? 0}
                    </span>
                    <span className={`series-tier ${tier.className}`}>{tier.label}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {showPager && (
        <nav className="pager" aria-label="Catalogue pages">
          <button
            type="button"
            className="pager__btn"
            onClick={() => setPage(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            «
          </button>
          <button
            type="button"
            className="pager__btn"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          {pageWindow(page, totalPages).map((p) => (
            <button
              key={p}
              type="button"
              className={`pager__btn ${p === page ? 'is-active' : ''}`}
              onClick={() => setPage(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className="pager__btn"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            type="button"
            className="pager__btn"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            aria-label="Last page"
          >
            »
          </button>
        </nav>
      )}
    </div>
  );
}
