import { useState, type FormEvent } from 'react';
import type { ReviewInput } from '../services/reviewsApi';

// The five scored mechanics, defined once so the labels and the input fields stay in sync.
const MECHANICS: { key: keyof Omit<ReviewInput, 'text'>; label: string }[] = [
  { key: 'gameplayScore', label: 'Gameplay' },
  { key: 'storyScore', label: 'Story & narrative' },
  { key: 'audiovisualScore', label: 'Audiovisual' },
  { key: 'replayabilityScore', label: 'Replayability' },
  { key: 'overallEnjoymentScore', label: 'Overall enjoyment' },
];

const DEFAULT_INPUT: ReviewInput = {
  gameplayScore: 5,
  storyScore: 5,
  audiovisualScore: 5,
  replayabilityScore: 5,
  overallEnjoymentScore: 5,
  text: '',
};

type ReviewModalProps = {
  gameTitle: string;
  /** When editing, the dialog starts pre-filled with the existing review's values. */
  initial?: ReviewInput;
  submitLabel: string;
  onSubmit: (input: ReviewInput) => Promise<void>;
  onClose: () => void;
};

/**
 * The "Write a review" pop-out dialog (User Story 2/3). The five 1–10 mechanic scores plus the
 * text live here; the final rating bubble and stars are COMPUTED from the five scores, mirroring
 * how the backend derives a review's overall score. The parent decides what submit does
 * (create vs. edit) and closes the dialog after a successful save.
 */
export function ReviewModal({ gameTitle, initial, submitLabel, onSubmit, onClose }: ReviewModalProps) {
  const [input, setInput] = useState<ReviewInput>(initial ?? DEFAULT_INPUT);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalRating =
    (input.gameplayScore +
      input.storyScore +
      input.audiovisualScore +
      input.replayabilityScore +
      input.overallEnjoymentScore) /
    5;
  // 5 stars represent the 10-point scale; filled count rounds to the nearest star.
  const filledStars = Math.round(finalRating / 2);

  function setScore(key: keyof Omit<ReviewInput, 'text'>, value: number) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    // Client-side guardrails matching the server's rules — every score 1–10, text non-empty.
    const scoresValid = MECHANICS.every(({ key }) => input[key] >= 1 && input[key] <= 10);
    if (!scoresValid) {
      setErrorMessage('Every score must be between 1 and 10.');
      return;
    }
    if (!input.text.trim()) {
      setErrorMessage('Please write a few words about the game.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(input);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your review.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      {/* Clicks inside the dialog must not bubble to the overlay's close handler. */}
      <div
        className="modal review-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Write a review"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
          ✕
        </button>

        <header className="review-modal__head">
          <h2>
            <span aria-hidden="true">❏</span> Write a review
          </h2>
          <p>Enjoying {gameTitle}?</p>
        </header>

        <form onSubmit={handleSubmit}>
          <textarea
            className="review-modal__text"
            rows={6}
            value={input.text}
            onChange={(event) => setInput((current) => ({ ...current, text: event.target.value }))}
            placeholder="Write your full thoughts and review here..."
          />

          <div className="review-modal__scores">
            {MECHANICS.map(({ key, label }) => (
              <label key={key} className="review-modal__score">
                <span>{label}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={input[key]}
                  onChange={(event) => setScore(key, Number(event.target.value))}
                />
              </label>
            ))}
          </div>

          <div className="review-modal__rating">
            <p className="review-modal__rating-label">Your Final Rating:</p>
            <span className="review-modal__bubble">{finalRating.toFixed(finalRating % 1 ? 1 : 0)}</span>
            <p className="review-modal__stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={index < filledStars ? 'is-filled' : ''}>★</span>
              ))}
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="library__error">
              {errorMessage}
            </p>
          )}

          <footer className="review-modal__foot">
            <p className="review-modal__note">
              Please ensure reviews remain respectful and adhere to community guidelines.
            </p>
            <div className="review-modal__actions">
              <button type="button" className="btn btn--outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn--cta" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : submitLabel}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
