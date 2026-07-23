import { apiRequest } from './apiClient';
import type { ReportReason } from './reportsApi';

// One account row in the Admin user list (backend AdminUserResponse).
export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Author';
  isDeactivated: boolean;
  createdAt: string;
};

// The local moderation state of a game (backend GameModerationResponse).
export type GameModeration = {
  id: number;
  isHidden: boolean;
  titleOverride: string | null;
  descriptionOverride: string | null;
  coverImageUrlOverride: string | null;
};

// A report as shown in the Admin queue, with extra context (backend ReportResponse).
export type AdminReport = {
  id: string;
  reviewId: string | null;
  commentId: string | null;
  reason: ReportReason;
  status: 'Open' | 'Resolved' | 'Dismissed';
  createdAt: string;
  resolvedAt: string | null;
  reporterDisplayName: string | null;
  targetText: string | null;
  targetGameId: number | null;
};

// --- Users ---
function listUsers(token: string | null): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>('/api/admin/users', { token });
}

function updateUserRole(
  userId: string,
  role: 'Admin' | 'Author',
  token: string | null,
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    body: { role },
    token,
  });
}

// T068a — deactivate/reactivate an account.
function updateUserStatus(
  userId: string,
  isDeactivated: boolean,
  token: string | null,
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/api/admin/users/${userId}/status`, {
    method: 'PUT',
    body: { isDeactivated },
    token,
  });
}

// T068a — delete an account (and its content).
function deleteUser(userId: string, token: string | null): Promise<void> {
  return apiRequest<void>(`/api/admin/users/${userId}`, { method: 'DELETE', token });
}

// --- Games ---
function setGameModeration(
  gameId: number,
  input: {
    isHidden: boolean;
    titleOverride?: string | null;
    descriptionOverride?: string | null;
    coverImageUrlOverride?: string | null;
  },
  token: string | null,
): Promise<GameModeration> {
  return apiRequest<GameModeration>(`/api/admin/games/${gameId}`, {
    method: 'PUT',
    body: input,
    token,
  });
}

// --- Content removal ---
function deleteReview(reviewId: string, token: string | null): Promise<void> {
  return apiRequest<void>(`/api/admin/reviews/${reviewId}`, { method: 'DELETE', token });
}

function deleteComment(commentId: string, token: string | null): Promise<void> {
  return apiRequest<void>(`/api/admin/comments/${commentId}`, { method: 'DELETE', token });
}

// --- Reports ---
function listReports(
  status: 'Open' | 'Resolved' | 'Dismissed',
  token: string | null,
): Promise<AdminReport[]> {
  return apiRequest<AdminReport[]>(`/api/admin/reports?status=${status}`, { token });
}

function resolveReport(
  reportId: string,
  action: 'RemoveContent' | 'Dismiss',
  token: string | null,
): Promise<AdminReport> {
  return apiRequest<AdminReport>(`/api/admin/reports/${reportId}/resolve`, {
    method: 'POST',
    body: { action },
    token,
  });
}

export const adminApi = {
  listUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  setGameModeration,
  deleteReview,
  deleteComment,
  listReports,
  resolveReport,
};
