import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { GamesApiError, gamesApi, type GameRanking } from '../services/gamesApi';

/**
 * The community leaderboard: every reviewed game ordered by aggregate impact score, best first.
 * The data comes straight from the reviews table via /api/games/rankings — no mock rows.
 */
export function RankingPage() {
  const { token } = useAuth();

  const [rankings, setRankings] = useState<GameRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage('');
    gamesApi
      .rankings(token)
      .then((result) => {
        if (active) setRankings(result);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof GamesApiError ? error.message : 'Could not load the rankings.',
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="ranking">
      <header className="directory__head">
        <h1 className="directory__title">Ranking</h1>
        <p className="directory__lede">
          The community leaderboard — games ranked by their impact score across all reviews.
        </p>
      </header>

      {isLoading && <p className="directory__status">Loading the leaderboard…</p>}

      {errorMessage && (
        <p role="alert" className="library__error">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && rankings.length === 0 && (
        <div className="ranking__empty">
          <p>No ranked games yet — scores appear once the community starts reviewing.</p>
          <Link to="/library" className="btn btn--cta">
            Browse the Game Library
          </Link>
        </div>
      )}

      <ol className="ranking__list">
        {rankings.map((game, index) => (
          <li key={game.id} className={`rank-row ${index < 3 ? 'rank-row--podium' : ''}`}>
            <Link to={`/games/${game.id}`} className="rank-row__link">
              <span className="rank-row__pos">{String(index + 1).padStart(2, '0')}</span>

              {game.coverImageUrl ? (
                <img
                  className="rank-row__cover"
                  src={game.coverImageUrl}
                  alt={`${game.title} cover`}
                  loading="lazy"
                />
              ) : (
                <div className="rank-row__cover rank-row__cover--empty">—</div>
              )}

              <div className="rank-row__body">
                <h2 className="rank-row__title">{game.title}</h2>
                <p className="rank-row__meta">
                  {game.releaseYear ?? 'Year unknown'} ·{' '}
                  {game.reviewCount} {game.reviewCount === 1 ? 'review' : 'reviews'}
                </p>
                <div className="rank-row__track">
                  <span style={{ width: `${(game.aggregateScore / 10) * 100}%` }} />
                </div>
              </div>

              <span className="rank-row__score">
                {game.aggregateScore.toFixed(1)}
                <small>/ 10</small>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
