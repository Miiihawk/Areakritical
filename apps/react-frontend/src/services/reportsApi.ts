import { apiRequest } from './apiClient';

// The four allowed report reasons (matches the backend ReportReason enum, serialized as strings).
export type ReportReason = 'Spam' | 'Harassment' | 'OffTopic' | 'Other';

// Mirrors the backend ReportResponse DTO (submission shape).
export type Report = {
  id: string;
  reviewId: string | null;
  commentId: string | null;
  reason: ReportReason;
  status: 'Open' | 'Resolved' | 'Dismissed';
  createdAt: string;
};

/**
 * POST /api/reports — flag a review OR a comment (exactly one target). Pass the target as either
 * `{ reviewId }` or `{ commentId }`.
 */
function submit(
  target: { reviewId?: string; commentId?: string },
  reason: ReportReason,
  token: string | null,
): Promise<Report> {
  return apiRequest<Report>('/api/reports', {
    method: 'POST',
    body: { reviewId: target.reviewId ?? null, commentId: target.commentId ?? null, reason },
    token,
  });
}

export const reportsApi = { submit };
