import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { adminApi, type GameModeration } from '../../services/adminApi';
import { GamesApiError, gamesApi, type Game, type BrowseSort } from '../../services/gamesApi';
import './Admin.css';

const PAGE_SIZE = 24;

const PLATFORMS: { key: string | null; label: string }[] = [
  { key: null, label: 'All platforms' },
  { key: 'pc', label: 'PC' },
  { key: 'playstation', label: 'PlayStation' },
  { key: 'xbox', label: 'Xbox' },
  { key: 'nintendo', label: 'Nintendo' },
  { key: 'retro', label: 'Retro' },
];

const SORTS: { key: BrowseSort; label: string }[] = [
  { key: 'popular', label: 'Most popular' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'name', label: 'A – Z' },
];

function coverBackground(url: string | null): CSSProperties {
  return url
    ? { backgroundImage: `url(${url})` }
    : { background: 'linear-gradient(150deg, hsl(265, 45%, 18%), #05040a 85%)' };
}

/**
 * Admin game management (User Story 8). Lists the live IGDB catalogue (browse + search) merged with
 * our local moderation rows, so the Admin can see every game, hide/unhide it from the public site,
 * or edit how its details display. Games are never added or deleted here — the catalogue is IGDB's,
 * and a hidden game stays in the database so it can be unhidden later.
 */
export function AdminGamesPage() {
  const { token } = useAuth();

  // Browse (default) list, accumulated across "Load more" pages.
  const [browseGames, setBrowseGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [platform, setPlatform] = useState<string | null>(null);
  const [sort, setSort] = useState<BrowseSort>('popular');

  // Search overlays the browse list while there's a term.
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);

  // Local moderation state keyed by game id (hidden flag + text overrides).
  const [moderations, setModerations] = useState<Record<number, GameModeration>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Game | null>(null);

  const isSearching = debouncedTerm.trim().length > 0;

  // Load the local moderation rows once — they rarely change and refresh in place after each edit.
  useEffect(() => {
    let active = true;
    adminApi
      .listGameModerations(token)
      .then((rows) => {
        if (active) setModerations(Object.fromEntries(rows.map((m) => [m.id, m])));
      })
      .catch(() => {
        /* Moderation badges are a nice-to-have; the catalogue still lists without them. */
      });
    return () => {
      active = false;
    };
  }, [token]);

  // Browse the catalogue (page 1) whenever the filters change and no search is active.
  useEffect(() => {
    if (isSearching) return;
    let active = true;
    setIsLoading(true);
    setErrorMessage('');
    setPage(1);
    Promise.all([
      gamesApi.browse(sort, { platform }, token, 1),
      gamesApi.browseCount(sort, { platform }, token),
    ])
      .then(([games, count]) => {
        if (!active) return;
        setBrowseGames(games);
        setTotal(count);
      })
      .catch((error) => {
        if (active) setErrorMessage(error instanceof GamesApiError ? error.message : 'Could not load games.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [platform, sort, token, isSearching]);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Run the search whenever the debounced term changes.
  useEffect(() => {
    const term = debouncedTerm.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    let active = true;
    setIsLoading(true);
    setErrorMessage('');
    gamesApi
      .search(term, token)
      .then((results) => {
        if (active) setSearchResults(results);
      })
      .catch((error) => {
        if (active) setErrorMessage(error instanceof GamesApiError ? error.message : 'Search failed.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedTerm, token]);

  async function loadMore() {
    setIsLoadingMore(true);
    try {
      const next = page + 1;
      const more = await gamesApi.browse(sort, { platform }, token, next);
      setBrowseGames((prev) => [...prev, ...more]);
      setPage(next);
    } catch (error) {
      setErrorMessage(error instanceof GamesApiError ? error.message : 'Could not load more games.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  // Persist a moderation change and update the local map so the row reflects it immediately.
  const saveModeration = useCallback(
    async (gameId: number, input: Omit<GameModeration, 'id'>) => {
      const saved = await adminApi.setGameModeration(gameId, input, token);
      setModerations((prev) => ({ ...prev, [gameId]: saved }));
      return saved;
    },
    [token],
  );

  async function toggleHidden(game: Game) {
    const current = moderations[game.id];
    setBusyId(game.id);
    setErrorMessage('');
    try {
      await saveModeration(game.id, {
        isHidden: !current?.isHidden,
        titleOverride: current?.titleOverride ?? null,
        descriptionOverride: current?.descriptionOverride ?? null,
        coverImageUrlOverride: current?.coverImageUrlOverride ?? null,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update the game.');
    } finally {
      setBusyId(null);
    }
  }

  const games = isSearching ? searchResults : browseGames;
  const hasMore = !isSearching && browseGames.length < total;

  const headerCount = useMemo(() => (isSearching ? games.length : total), [isSearching, games.length, total]);

  return (
    <div className="adm">
      <Link to="/admin" className="adm__back">
        ← Back to dashboard
      </Link>

      <div className="adm__head">
        <div>
          <p className="adm__eyebrow">Game Management</p>
          <h1 className="adm__title">Manage games in one place.</h1>
        </div>
        <div className="adm__chips">
          <div className="adm__chip adm__chip--accent">
            <span className="adm__chip-label">{isSearching ? 'Matches' : 'Total Games'}</span>
            <span className="adm__chip-value">{headerCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="adm-error">
          {errorMessage}
        </p>
      )}

      <div className="adm-panel">
        <div className="adm-toolbar">
          <select
            className="adm-select"
            value={platform ?? ''}
            onChange={(e) => setPlatform(e.target.value || null)}
            disabled={isSearching}
            aria-label="Filter by platform"
          >
            {PLATFORMS.map((p) => (
              <option key={p.label} value={p.key ?? ''}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            className="adm-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as BrowseSort)}
            disabled={isSearching}
            aria-label="Sort games"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            className="adm-search"
            placeholder="Search game name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="adm-status">Loading games…</p>
        ) : games.length === 0 ? (
          <div className="adm-empty">
            <p className="adm-empty__title">No games found.</p>
            <p className="adm-empty__hint">
              {isSearching ? 'Try a different search term.' : 'Try changing the platform or sort.'}
            </p>
          </div>
        ) : (
          <ul className="adm-list">
            {games.map((game) => {
              const mod = moderations[game.id];
              const hidden = mod?.isHidden ?? false;
              const title = mod?.titleOverride || game.title;
              const cover = mod?.coverImageUrlOverride || game.coverImageUrl;
              const description = mod?.descriptionOverride || game.description;

              return (
                <li key={game.id} className="adm-row">
                  <div className="adm-row__cover" style={coverBackground(cover)} aria-hidden="true" />
                  <div className="adm-row__main">
                    <div className="adm-row__badges">
                      {game.genres[0] && <span className="adm-badge">{game.genres[0]}</span>}
                      <span className={`adm-badge ${hidden ? 'adm-badge--warn' : 'adm-badge--ok'}`}>
                        {hidden ? 'Hidden' : 'Visible'}
                      </span>
                      {game.releaseYear && <span className="adm-row__stamp">Released {game.releaseYear}</span>}
                    </div>
                    <p className="adm-row__name">{title}</p>
                    {description && <p className="adm-row__desc">{description}</p>}
                  </div>

                  <div className="adm-row__actions">
                    <Link to={`/games/${game.id}`} className="adm-btn">
                      View
                    </Link>
                    <button type="button" className="adm-btn" onClick={() => setEditing(game)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`adm-btn ${hidden ? '' : 'adm-btn--danger'}`}
                      onClick={() => toggleHidden(game)}
                      disabled={busyId === game.id}
                    >
                      {hidden ? 'Unhide' : 'Hide'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && (
          <div className="adm-load-more">
            <button type="button" className="adm-btn" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading…' : 'Load more games'}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <EditGameModal
          game={editing}
          moderation={moderations[editing.id] ?? null}
          onClose={() => setEditing(null)}
          onSave={saveModeration}
        />
      )}
    </div>
  );
}

/**
 * The edit form (Edit game reference). The backend only stores display *overrides* on top of IGDB's
 * data, so this form edits exactly those: title, cover URL, description, and the hidden flag. IGDB's
 * own metadata (genres, developer, release) is shown read-only for context. Leaving an override blank
 * clears it — the public page then falls back to IGDB's value.
 */
function EditGameModal({
  game,
  moderation,
  onClose,
  onSave,
}: {
  game: Game;
  moderation: GameModeration | null;
  onClose: () => void;
  onSave: (gameId: number, input: Omit<GameModeration, 'id'>) => Promise<GameModeration>;
}) {
  const [title, setTitle] = useState(moderation?.titleOverride ?? '');
  const [coverUrl, setCoverUrl] = useState(moderation?.coverImageUrlOverride ?? '');
  const [description, setDescription] = useState(moderation?.descriptionOverride ?? '');
  const [isHidden, setIsHidden] = useState(moderation?.isHidden ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave(game.id, {
        isHidden,
        titleOverride: title.trim() || null,
        descriptionOverride: description.trim() || null,
        coverImageUrlOverride: coverUrl.trim() || null,
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save the game.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="adm-modal__overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="adm-modal" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <p className="adm-modal__eyebrow">Edit game record</p>
        <h2 className="adm-modal__title">{moderation?.titleOverride || game.title}</h2>
        <p className="adm-modal__sub">
          Overrides how this game displays on the public site. Blank fields fall back to the catalogue.
        </p>

        <div className="adm-readonly">
          <div>
            <strong>Catalogue title:</strong> {game.title}
          </div>
          {game.genres.length > 0 && (
            <div>
              <strong>Genres:</strong> {game.genres.join(', ')}
            </div>
          )}
          {(game.developer || game.publisher) && (
            <div>
              <strong>Studio:</strong> {[game.developer, game.publisher].filter(Boolean).join(' · ')}
            </div>
          )}
          {game.releaseYear && (
            <div>
              <strong>Released:</strong> {game.releaseYear}
            </div>
          )}
        </div>

        <label className="adm-field">
          <span className="adm-field__label">Title override</span>
          <input
            className="adm-field__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={game.title}
          />
        </label>

        <label className="adm-field">
          <span className="adm-field__label">Cover image URL override</span>
          <input
            className="adm-field__input"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder={game.coverImageUrl ?? 'https://…'}
          />
        </label>

        <label className="adm-field">
          <span className="adm-field__label">Description override</span>
          <textarea
            className="adm-field__textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={game.description ?? 'Synopsis shown on the game page…'}
          />
        </label>

        <label className="adm-field--check">
          <input type="checkbox" checked={isHidden} onChange={(e) => setIsHidden(e.target.checked)} />
          <span>Hide this game from the public site (non-admins get a 404)</span>
        </label>

        {errorMessage && (
          <p role="alert" className="adm-error">
            {errorMessage}
          </p>
        )}

        <div className="adm-modal__actions">
          <button type="button" className="adm-btn" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="adm-btn adm-btn--primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
