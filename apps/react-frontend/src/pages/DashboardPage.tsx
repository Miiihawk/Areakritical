import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { profileApi, type Profile } from '../services/profileApi'
import { GamesApiError, gamesApi, type Game, type GameRanking } from '../services/gamesApi'
import { reviewsApi, type LatestReview } from '../services/reviewsApi'
import { ScrollRow } from '../components/ScrollRow'
import { SearchSuggest } from '../components/SearchSuggest'
import './Dashboard.css'

// Platform families understood by the backend's browse endpoint (null = no filter).
const PLATFORMS: { key: string | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'pc', label: 'PC' },
  { key: 'playstation', label: 'PlayStation' },
  { key: 'xbox', label: 'Xbox' },
  { key: 'nintendo', label: 'Nintendo' },
  { key: 'retro', label: 'Retro' },
]

// How many of the featured pool games rotate through the banner.
const FEATURED_POOL_SIZE = 5
const FEATURED_ROTATE_MS = 7000

function coverBackground(coverImageUrl: string | null, fallbackHue = 265): CSSProperties {
  return coverImageUrl
    ? {
        backgroundImage: `url(${coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: `linear-gradient(150deg, hsl(${fallbackHue}, 45%, 18%), #05040a 85%)` }
}

export function DashboardPage() {
  const { token } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [latestReviews, setLatestReviews] = useState<LatestReview[]>([])
  const [rankings, setRankings] = useState<GameRanking[]>([])
  const [featuredGames, setFeaturedGames] = useState<Game[]>([])
  const [platformGames, setPlatformGames] = useState<Game[]>([])
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [featuredIndex, setFeaturedIndex] = useState(0)

  // The signed-in user's profile — powers the greeting and the avatar initials.
  useEffect(() => {
    let active = true
    profileApi
      .get(token)
      .then((result) => {
        if (active) setProfile(result)
      })
      .catch(() => {
        /* A missing profile shouldn't blank the dashboard; the other sections load independently. */
      })
    return () => {
      active = false
    }
  }, [token])

  // Latest Reviews + Popular Today both come from OUR database (reviews/rankings), never IGDB.
  useEffect(() => {
    let active = true
    Promise.all([reviewsApi.latest(token, 6), gamesApi.rankings(token)])
      .then(([latest, ranked]) => {
        if (!active) return
        setLatestReviews(latest)
        setRankings(ranked)
      })
      .catch((error) => {
        if (active) {
          setErrorMessage(error instanceof GamesApiError ? error.message : 'Could not load community data.')
        }
      })
    return () => {
      active = false
    }
  }, [token])

  // The featured hero rotates through the well-known catalogue (IGDB metadata only).
  useEffect(() => {
    let active = true
    gamesApi
      .browse('popular', {}, token)
      .then((result) => {
        if (active) setFeaturedGames(result.slice(0, FEATURED_POOL_SIZE))
      })
      .catch(() => {
        if (active) setFeaturedGames([])
      })
    return () => {
      active = false
    }
  }, [token])

  // The Browse by Platform row — refetched whenever the active tab changes.
  useEffect(() => {
    let active = true
    setIsLoadingPlatform(true)
    gamesApi
      .browse('popular', { platform: activePlatform }, token)
      .then((result) => {
        if (active) setPlatformGames(result)
      })
      .catch(() => {
        if (active) setPlatformGames([])
      })
      .finally(() => {
        if (active) setIsLoadingPlatform(false)
      })
    return () => {
      active = false
    }
  }, [activePlatform, token])

  const featured = featuredGames[featuredIndex] ?? null

  // Auto-rotate the featured banner through the pool.
  useEffect(() => {
    if (featuredGames.length < 2) {
      return
    }
    const timer = setInterval(
      () => setFeaturedIndex((index) => (index + 1) % featuredGames.length),
      FEATURED_ROTATE_MS,
    )
    return () => clearInterval(timer)
  }, [featuredGames.length])

  const displayName = profile?.displayName?.trim() || profile?.username || 'reviewer'
  const initials = displayName.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AK'

  const popular = useMemo(() => rankings.slice(0, 12), [rankings])

  return (
    <div className="dash">
      {/* ---- toolbar ---- */}
      <div className="dash__toolbar">
        <SearchSuggest placeholder="Search titles in the archive..." />
        <div className="dash__toolbar-right">
          <Link to="/library" className="dash__icon-btn" aria-label="Browse library">
            ▦
          </Link>
          <Link to="/profile" className="dash__avatar" aria-label="Your profile">
            {initials}
          </Link>
        </div>
      </div>

      <p className="dash__greeting">
        Welcome back, <strong>{displayName}</strong>. Here’s what’s worth revisiting.
      </p>

      {errorMessage && (
        <p role="alert" className="library__error">
          {errorMessage}
        </p>
      )}

      {/* ---- featured banner (auto-rotates) ---- */}
      {featured && (
        <section className="feat" style={coverBackground(featured.coverImageUrl)}>
          <div className="feat__scrim" />
          {/* Keyed by game id so the copy re-animates on every rotation. */}
          <div key={featured.id} className="feat__body feat__body--fade">
            <p className="feat__eyebrow">Featured This Week</p>
            <h1 className="feat__title">{featured.title}</h1>
            <div className="feat__meta">
              {featured.releaseYear && <span>{featured.releaseYear}</span>}
              <span className="feat__pill">Retrospective</span>
            </div>
            {featured.description && <p className="feat__desc">{featured.description}</p>}
            <div className="feat__cta">
              <Link to={`/games/${featured.id}`} className="btn btn--primary">
                Write a Review
              </Link>
              <Link to="/library" className="btn btn--outline">
                Browse the Archive
              </Link>
            </div>
          </div>
          <div className="feat__dots">
            {featuredGames.map((game, index) => (
              <button
                key={game.id}
                type="button"
                className={`feat__dot ${index === featuredIndex ? 'is-active' : ''}`}
                aria-label={`Feature ${game.title}`}
                onClick={() => setFeaturedIndex(index)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---- latest reviews (our DB), top section ---- */}
      <Section title="Latest Reviews" action="Browse all" onAction={() => navigate('/ranking')}>
        {latestReviews.length === 0 ? (
          <p className="dash__status">No reviews yet — be the first to write one!</p>
        ) : (
          <div className="reviews">
            {latestReviews.map((review) => (
              <Link key={review.reviewId} to={`/games/${review.gameId}`} className="review">
                <div className="review__cover" style={coverBackground(review.gameCoverImageUrl, 200)}>
                  <span className="review__status status--new">Review</span>
                </div>
                <div className="review__body">
                  <div className="review__head">
                    <h3 className="review__title">{review.gameTitle}</h3>
                    <span className="review__score">{review.overallScore.toFixed(1)}</span>
                  </div>
                  <p className="review__blurb">{review.text}</p>
                  <p className="review__author">by {review.authorDisplayName}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* ---- popular today: OUR community scores (rankings), not IGDB ---- */}
      <Section title="Popular Today" action="See all" onAction={() => navigate('/ranking')}>
        {popular.length === 0 ? (
          <p className="dash__status">No community scores yet — reviews power this row.</p>
        ) : (
          <ScrollRow>
            {popular.map((game) => (
              <Link key={game.id} to={`/games/${game.id}`} className="card">
                <div className="card__cover" style={coverBackground(game.coverImageUrl)}>
                  <span className="card__score">★ {game.aggregateScore.toFixed(1)}</span>
                  {game.releaseYear && <span className="card__year">{game.releaseYear}</span>}
                </div>
                <h3 className="card__title">{game.title}</h3>
              </Link>
            ))}
          </ScrollRow>
        )}
      </Section>

      {/* ---- browse by platform (IGDB catalogue metadata) ---- */}
      <Section title="Browse by Platform">
        <div className="platforms">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.label}
              type="button"
              className={`platform ${activePlatform === platform.key ? 'is-active' : ''}`}
              onClick={() => setActivePlatform(platform.key)}
            >
              {platform.label}
            </button>
          ))}
        </div>
        {isLoadingPlatform ? (
          <p className="dash__status">Loading titles…</p>
        ) : platformGames.length === 0 ? (
          <p className="dash__status">No titles found for this platform.</p>
        ) : (
          <ScrollRow>
            {platformGames.map((game) => (
              <Link key={game.id} to={`/games/${game.id}`} className="card">
                <div className="card__cover" style={coverBackground(game.coverImageUrl)}>
                  {game.releaseYear && <span className="card__year">{game.releaseYear}</span>}
                </div>
                <h3 className="card__title">{game.title}</h3>
              </Link>
            ))}
          </ScrollRow>
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string
  action?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <section className="sec">
      <div className="sec__head">
        <h2 className="sec__title">{title}</h2>
        {action && (
          <button type="button" className="sec__action" onClick={onAction}>
            {action} <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
