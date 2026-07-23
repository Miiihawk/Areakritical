import { apiRequest } from './apiClient';

// Mirrors the backend ReviewResponse DTO. `overallScore` is the computed average of the five
// mechanic scores; `authorDisplayName` is resolved live from the author's current profile.
export type Review = {
  id: string;
  gameId: number;
  authorId: string;
  authorDisplayName: string;
  gameplayScore: number;
  storyScore: number;
  audiovisualScore: number;
  replayabilityScore: number;
  overallEnjoymentScore: number;
  overallScore: number;
  text: string;
  createdAt: string;
  updatedAt: string;
};

// The five scores + text a user submits. Matches the backend ReviewRequest DTO.
export type ReviewInput = {
  gameplayScore: number;
  storyScore: number;
  audiovisualScore: number;
  replayabilityScore: number;
  overallEnjoymentScore: number;
  text: string;
};

// One entry of the dashboard's "Latest Reviews" feed (backend LatestReviewResponse).
export type LatestReview = {
  reviewId: string;
  gameId: number;
  gameTitle: string;
  gameCoverImageUrl: string | null;
  authorDisplayName: string;
  overallScore: number;
  text: string;
  createdAt: string;
};

/** GET /api/reviews/latest — the newest reviews across all games. */
function latest(token: string | null, count = 6): Promise<LatestReview[]> {
  return apiRequest<LatestReview[]>(`/api/reviews/latest?count=${count}`, { token });
}

/** POST /api/games/{gameId}/reviews — create or edit-in-place the caller's review for a game. */
function submit(gameId: number, input: ReviewInput, token: string | null): Promise<Review> {
  return apiRequest<Review>(`/api/games/${gameId}/reviews`, { method: 'POST', body: input, token });
}

/** PUT /api/reviews/{reviewId} — edit your own review. */
function update(reviewId: string, input: ReviewInput, token: string | null): Promise<Review> {
  return apiRequest<Review>(`/api/reviews/${reviewId}`, { method: 'PUT', body: input, token });
}

/** DELETE /api/reviews/{reviewId} — delete your own review. */
function remove(reviewId: string, token: string | null): Promise<void> {
  return apiRequest<void>(`/api/reviews/${reviewId}`, { method: 'DELETE', token });
}

export const reviewsApi = { submit, update, remove, latest };
