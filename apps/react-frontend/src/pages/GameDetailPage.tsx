import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { getUserIdFromToken } from '../auth/currentUserId';
import { gamesApi, GamesApiError, type GameDetail } from '../services/gamesApi';
import { reviewsApi, type Review, type ReviewInput } from '../services/reviewsApi';
import { ReviewModal } from '../components/ReviewModal';
import { ReviewList } from '../components/ReviewList';

type Tab = 'description' | 'reviews' | 'impact';

// The five scored mechanics that make up a review, reused for the impact breakdown.
const IMPACT_METRICS: { key: keyof Review; label: string }[] = [
  { key: 'gameplayScore', label: 'Gameplay' },
  { key: 'storyScore', label: 'Story & Narrative' },
  { key: 'audiovisualScore', label: 'Audiovisual' },
  { key: 'replayabilityScore', label: 'Replayability' },
  { key: 'overallEnjoymentScore', label: 'Overall Enjoyment' },
];

/**
 * The game detail page (User Stories 1–4/7 all surface here). Two-column layout: a sticky
 * poster/info rail on the left, and a tabbed content column (Description / Reviews / Impact) on
 * the right — Description opens first. Writing/editing a review happens in a pop-out modal.
 * Every data state — loading, error, not-found, empty, populated — is handled explicitly
 * (Constitution III).
 */
export function GameDetailPage() {
  const { id } = useParams();
  const gameId = Number(id);
  const { token } = useAuth();
  const currentUserId = getUserIdFromToken(token);

  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('description');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setNotFound(false);
    try {
      const result = await gamesApi.getById(gameId, token);
      setDetail(result);
    } catch (error) {
      // The server returns 404 for an unknown OR hidden game — both read as "not found" here.
      if (error instanceof GamesApiError && error.message === 'game not found') {
        setNotFound(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Could not load this game.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameId, token]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  // The caller's own review for this game, if any — drives create-vs-edit in the modal.
  const myReview = detail?.reviews.find((review) => review.authorId === currentUserId) ?? null;

  // Average each mechanic across the loaded reviews for the Impact panel. Empty → all zeros.
  const impact = useMemo(() => {
    const reviews = detail?.reviews ?? [];
    return IMPACT_METRICS.map(({ key, label }) => {
      const average =
        reviews.length === 0
          ? 0
          : reviews.reduce((sum, review) => sum + (review[key] as number), 0) / reviews.length;
      return { label, value: average };
    });
  }, [detail]);

  async function handleSubmitReview(input: ReviewInput) {
    // If I already have a review, this is an edit; otherwise it's a create. The server enforces the
    // same one-per-game rule, but choosing the right call here keeps the UX clear.
    if (myReview) {
      await reviewsApi.update(myReview.id, input, token);
    } else {
      await reviewsApi.submit(gameId, input, token);
    }
    await loadDetail();
  }

  async function handleDeleteReview(reviewId: string) {
    if (!window.confirm('Delete your review? This also removes its comments.')) {
      return;
    }
    await reviewsApi.remove(reviewId, token);
    await loadDetail();
  }

  function openReviewModal() {
    setTab('reviews');
    setIsReviewModalOpen(true);
  }

  // --- Explicit render states ---
  if (isLoading) {
    return <section className="panel"><p>Loading game…</p></section>;
  }

  if (notFound) {
    return (
      <section className="panel">
        <h1>Game not found</h1>
        <p>This game doesn’t exist or is no longer available.</p>
        <p><Link to="/library">← Back to the Game Library</Link></p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="panel">
        <p role="alert" className="library__error">{errorMessage}</p>
      </section>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="gd">
      <div className="gd__grid">
        {/* ---------------- left rail: poster + actions + facts ---------------- */}
        <aside className="gd__rail">
          {detail.coverImageUrl ? (
            <img className="gd__cover" src={detail.coverImageUrl} alt={`${detail.title} cover`} />
          ) : (
            <div className="gd__cover gd__cover--empty">No cover</div>
          )}

          <div className="gd__actions">
            <button type="button" className="btn btn--cta gd__action-primary" onClick={openReviewModal}>
              <span aria-hidden="true">✎</span> {myReview ? 'Edit Your Review' : 'Write a Review'}
            </button>
          </div>

          <div className="gd__stats">
            <div className="gd__stat">
              <span className="gd__stat-icon" aria-hidden="true">★</span>
              <div>
                <strong>
                  {detail.aggregateScore !== null ? detail.aggregateScore.toFixed(1) : '—'}
                </strong>
                <span>Avg Score</span>
              </div>
            </div>
            <div className="gd__stat">
              <span className="gd__stat-icon gd__stat-icon--pink" aria-hidden="true">❝</span>
              <div>
                <strong>{detail.reviewCount}</strong>
                <span>{detail.reviewCount === 1 ? 'Review' : 'Reviews'}</span>
              </div>
            </div>
          </div>

          <dl className="gd__facts">
            <div className="gd__fact">
              <dt>Type</dt>
              <dd><span className="gd__chip">Game</span></dd>
            </div>
            <div className="gd__fact">
              <dt>Released</dt>
              <dd>{detail.releaseYear ?? 'Unknown'}</dd>
            </div>
            <div className="gd__fact">
              <dt>Developer</dt>
              <dd>{detail.developer ?? 'Unknown'}</dd>
            </div>
            <div className="gd__fact">
              <dt>Publisher</dt>
              <dd>{detail.publisher ?? 'Unknown'}</dd>
            </div>
            <div className="gd__fact gd__fact--stack">
              <dt>Genres</dt>
              <dd>
                {detail.genres.length > 0 ? (
                  <span className="gd__genres">
                    {detail.genres.map((genre) => (
                      <span key={genre} className="gd__chip">{genre}</span>
                    ))}
                  </span>
                ) : (
                  'Unknown'
                )}
              </dd>
            </div>
          </dl>
        </aside>

        {/* ---------------- right column: breadcrumb, tabs, content ---------------- */}
        <main className="gd__main">
          <p className="gd__crumbs">
            <Link to="/library">Game Library</Link>
            <span aria-hidden="true"> / </span>
            <span>{detail.title}</span>
          </p>
          <h1 className="gd__title">{detail.title}</h1>

          <nav className="gd__tabs" aria-label="Game sections">
            <button
              type="button"
              className={`gd__tab ${tab === 'description' ? 'is-active' : ''}`}
              onClick={() => setTab('description')}
            >
              Description
            </button>
            <button
              type="button"
              className={`gd__tab ${tab === 'reviews' ? 'is-active' : ''}`}
              onClick={() => setTab('reviews')}
            >
              Reviews ({detail.reviewCount})
            </button>
            <button
              type="button"
              className={`gd__tab ${tab === 'impact' ? 'is-active' : ''}`}
              onClick={() => setTab('impact')}
            >
              Impact
            </button>
          </nav>

          {/* ---- Description ---- */}
          {tab === 'description' && (
            <section className="gd__panel">
              {detail.description ? (
                <p className="gd__synopsis">{detail.description}</p>
              ) : (
                <p className="gd__muted">No description available for this title yet.</p>
              )}
            </section>
          )}

          {/* ---- Reviews ---- */}
          {tab === 'reviews' && (
            <>
              <section className="gd__cta-banner">
                <p>
                  Share your thoughts about <strong>{detail.title}</strong> with the community.
                </p>
                <button type="button" className="btn btn--cta" onClick={openReviewModal}>
                  <span aria-hidden="true">✎</span> Write Review
                </button>
              </section>

              <ReviewList
                reviews={detail.reviews}
                currentUserId={currentUserId}
                onEditReview={openReviewModal}
                onDeleteReview={handleDeleteReview}
              />
            </>
          )}

          {/* ---- Impact ---- */}
          {tab === 'impact' && (
            <section className="impact">
              <p className="impact__eyebrow">Impact Score</p>
              <p className="impact__score">
                {detail.aggregateScore !== null ? detail.aggregateScore.toFixed(1) : '0.0'}
              </p>
              <p className="impact__sub">Composite impact score</p>

              <ul className="impact__bars">
                {impact.map((metric) => (
                  <li key={metric.label} className="impact__bar">
                    <div className="impact__bar-head">
                      <span>{metric.label}</span>
                      <span>{metric.value.toFixed(1)} / 10</span>
                    </div>
                    <div className="impact__track">
                      <span style={{ width: `${(metric.value / 10) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>

              <p className="impact__foot">
                Based on {detail.reviewCount} {detail.reviewCount === 1 ? 'review' : 'reviews'}
              </p>
            </section>
          )}
        </main>
      </div>

      {isReviewModalOpen && (
        <ReviewModal
          gameTitle={detail.title}
          initial={myReview ?? undefined}
          submitLabel={myReview ? 'Update Review' : 'Submit Review'}
          onSubmit={handleSubmitReview}
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}
    </div>
  );
}
