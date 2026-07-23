import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/useAuth';
import { adminApi, type GameModeration } from '../../services/adminApi';

/**
 * Admin game curation (User Story 8). A game is identified by its IGDB id; the Admin enters that id,
 * then sets the hide flag and/or text overrides. Because the local Game row is created lazily, this
 * works even for a game nobody has reviewed yet.
 */
export function AdminGamesPage() {
  const { token } = useAuth();
  const [gameId, setGameId] = useState('');
  const [isHidden, setIsHidden] = useState(false);
  const [titleOverride, setTitleOverride] = useState('');
  const [descriptionOverride, setDescriptionOverride] = useState('');
  const [coverImageUrlOverride, setCoverImageUrlOverride] = useState('');

  const [result, setResult] = useState<GameModeration | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setResult(null);

    const numericId = Number(gameId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setErrorMessage('Enter a valid numeric game id.');
      return;
    }

    setIsSaving(true);
    try {
      // Empty override fields are sent as null ("no override, use IGDB's value").
      const saved = await adminApi.setGameModeration(
        numericId,
        {
          isHidden,
          titleOverride: titleOverride.trim() || null,
          descriptionOverride: descriptionOverride.trim() || null,
          coverImageUrlOverride: coverImageUrlOverride.trim() || null,
        },
        token,
      );
      setResult(saved);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update the game.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel">
      <h1>Games</h1>
      <p>Hide a game or override how its details display. Enter the game’s IGDB id.</p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          <span>Game id</span>
          <input value={gameId} onChange={(event) => setGameId(event.target.value)} />
        </label>
        <label className="admin-form__check">
          <input type="checkbox" checked={isHidden} onChange={(event) => setIsHidden(event.target.checked)} />
          <span>Hidden (non-Admins get a 404)</span>
        </label>
        <label>
          <span>Title override</span>
          <input value={titleOverride} onChange={(event) => setTitleOverride(event.target.value)} />
        </label>
        <label>
          <span>Description override</span>
          <textarea
            rows={2}
            value={descriptionOverride}
            onChange={(event) => setDescriptionOverride(event.target.value)}
          />
        </label>
        <label>
          <span>Cover image URL override</span>
          <input
            value={coverImageUrlOverride}
            onChange={(event) => setCoverImageUrlOverride(event.target.value)}
          />
        </label>

        {errorMessage && <p role="alert" className="library__error">{errorMessage}</p>}

        <button type="submit" className="btn btn--cta" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save moderation'}
        </button>
      </form>

      {result && (
        <p className="profile__ok">
          Saved. Game {result.id} is now {result.isHidden ? 'hidden' : 'visible'}.
        </p>
      )}
    </section>
  );
}
