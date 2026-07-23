import { useState } from 'react';
import type { Review } from '../services/reviewsApi';
import { CommentList } from './CommentList';
import { ReportDialog } from './ReportDialog';

// The five mechanics, for rendering each review's score breakdown.
const MECHANIC_LABELS: { key: keyof Review; label: string }[] = [
  { key: 'gameplayScore', label: 'Gameplay' },
  { key: 'storyScore', label: 'Story' },
  { key: 'audiovisualScore', label: 'Audiovisual' },
  { key: 'replayabilityScore', label: 'Replayability' },
  { key: 'overallEnjoymentScore', label: 'Enjoyment' },
];

/** Initials for the avatar circle, matching the profile page's style. */
export function initialsOf(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AK';
}

/** A short date like "7/18/2026" for card headers. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

type ReviewListProps = {
  reviews: Review[];
  currentUserId: string | null;
  onEditReview: (review: Review) => void;
  onDeleteReview: (reviewId: string) => void;
};

/**
 * The list of reviews on a game's detail page (User Stories 1, 3, 4, 7). Each review renders as a
 * card — avatar, author, date, score badge, actions — with its comment thread underneath. Edit/
 * Delete appear on the signed-in user's OWN review; Report on everyone else's.
 */
export function ReviewList({ reviews, currentUserId, onEditReview, onDeleteReview }: ReviewListProps) {
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);

  if (reviews.length === 0) {
    // The "no reviews yet" empty state (Constitution III / FR-003).
    return <p className="review-list__empty">No reviews yet. Be the first to write one!</p>;
  }

  return (
    <ul className="review-list">
      {reviews.map((review) => {
        const isMine = review.authorId === currentUserId;

        return (
          <li key={review.id} className="rev-card">
            <header className="rev-card__head">
              <span className="avatar" aria-hidden="true">{initialsOf(review.authorDisplayName)}</span>
              <div className="rev-card__who">
                <p className="rev-card__author">{review.authorDisplayName}</p>
                <p className="rev-card__date">{shortDate(review.createdAt)}</p>
              </div>

              <div className="rev-card__side">
                <span className="rev-card__badge">
                  <i aria-hidden="true">★</i> {review.overallScore.toFixed(review.overallScore % 1 ? 1 : 0)}/10
                </span>
                {isMine ? (
                  <>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Edit your review"
                      title="Edit"
                      onClick={() => onEditReview(review)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label="Delete your review"
                      title="Delete"
                      onClick={() => onDeleteReview(review.id)}
                    >
                      🗑
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Report this review"
                    title="Report"
                    onClick={() => setReportingReviewId(review.id)}
                  >
                    ⚑
                  </button>
                )}
              </div>
            </header>

            <p className="rev-card__text">{review.text}</p>

            <ul className="rev-card__scores">
              {MECHANIC_LABELS.map(({ key, label }) => (
                <li key={key}>
                  <span>{label}</span>
                  <strong>{review[key] as number}</strong>
                </li>
              ))}
            </ul>

            {reportingReviewId === review.id && (
              <ReportDialog
                target={{ reviewId: review.id }}
                onClose={() => setReportingReviewId(null)}
              />
            )}

            {/* Each review carries its own comment thread. */}
            <CommentList reviewId={review.id} />
          </li>
        );
      })}
    </ul>
  );
}
