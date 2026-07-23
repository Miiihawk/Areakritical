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
  const [sort, setSort] = useState<SortKey>('rating');
  const [platform, setPlatform] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [decade, setDecade] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [games, setGames] = useState<Game[]>([]);
  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Community scores, loaded once — keyed by game id for the card badges.
  useEffect(() => {
    let active = true;
    gamesApi
      .rankings(token)
      .then((result) => {
        if (active) setRankings(result);
      })
      .catch(() => {
        /* Scores are decoration here; the catalogue still renders without them. */
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

  // Browse mode: refetch whenever the sort or any filter changes.
  useEffect(() => {
    if (mode !== 'browse') {
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
  }, [mode, sort, platform, genre, decade, token]);

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

  // "Highest Rated" always sorts by OUR community scores (reviewed games first, best score on
  // top; unreviewed keep their catalogue order after them). In search mode the other sorts are
  // applied client-side too, since the search endpoint has no ordering options.
  const shownGames = useMemo(() => {
    const copy = [...games];
    if (sort === 'rating') {
      return copy.sort(
        (a, b) =>
          (rankById.get(b.id)?.aggregateScore ?? -1) - (rankById.get(a.id)?.aggregateScore ?? -1),
      );
    }
    if (mode === 'browse') {
      // The backend already ordered the catalogue for newest/oldest/name.
      return copy;
    }
    switch (sort) {
      case 'name':
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      case 'newest':
        return copy.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
      default:
        return copy.sort((a, b) => (a.releaseYear ?? Infinity) - (b.releaseYear ?? Infinity));
    }
  }, [games, mode, sort, rankById]);

  const hasActiveFilters = platform !== null || genre !== null || decade !== null;

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
          Found <strong>{shownGames.length}</strong> indexed {shownGames.length === 1 ? 'title' : 'titles'}
          {mode === 'search' && ` for “${searchTerm}”`}
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

      {isLoading && <p className="directory__status">Loading the archive…</p>}

      {!isLoading && !errorMessage && shownGames.length === 0 && (
        <p className="directory__status">
          {mode === 'search' ? `No titles found for “${searchTerm}”.` : 'No titles to show.'}
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
    </div>
  );
}
