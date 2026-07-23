import { apiRequest } from './apiClient';

// Mirrors the backend CommentResponse DTO.
export type Comment = {
  id: string;
  reviewId: string;
  authorId: string;
  authorDisplayName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

// The paginated envelope returned by the list endpoint.
export type CommentPage = {
  comments: Comment[];
  page: number;
  pageSize: number;
  totalCount: number;
};

/** GET /api/reviews/{reviewId}/comments — one page of a review's comments. */
function list(
  reviewId: string,
  token: string | null,
  page = 1,
  pageSize = 20,
): Promise<CommentPage> {
  return apiRequest<CommentPage>(
    `/api/reviews/${reviewId}/comments?page=${page}&pageSize=${pageSize}`,
    { token },
  );
}

/** POST /api/reviews/{reviewId}/comments — add a comment to a review. */
function create(reviewId: string, text: string, token: string | null): Promise<Comment> {
  return apiRequest<Comment>(`/api/reviews/${reviewId}/comments`, {
    method: 'POST',
    body: { text },
    token,
  });
}

/** PUT /api/comments/{commentId} — edit your own comment. */
function update(commentId: string, text: string, token: string | null): Promise<Comment> {
  return apiRequest<Comment>(`/api/comments/${commentId}`, { method: 'PUT', body: { text }, token });
}

/** DELETE /api/comments/{commentId} — delete your own comment. */
function remove(commentId: string, token: string | null): Promise<void> {
  return apiRequest<void>(`/api/comments/${commentId}`, { method: 'DELETE', token });
}

export const commentsApi = { list, create, update, remove };
