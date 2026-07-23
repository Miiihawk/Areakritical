import { apiRequest } from './apiClient';

// Mirrors the backend ProfileResponse DTO. username/email are read-only on this screen.
export type Profile = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
};

/** GET /api/profile — read my profile. */
function get(token: string | null): Promise<Profile> {
  return apiRequest<Profile>('/api/profile', { token });
}

/** PUT /api/profile — update my display name / bio. */
function update(
  input: { displayName?: string; bio?: string },
  token: string | null,
): Promise<Profile> {
  return apiRequest<Profile>('/api/profile', { method: 'PUT', body: input, token });
}

/** POST /api/profile/password — change my password (new + confirmation, no current password). */
function changePassword(
  newPassword: string,
  confirmNewPassword: string,
  token: string | null,
): Promise<void> {
  return apiRequest<void>('/api/profile/password', {
    method: 'POST',
    body: { newPassword, confirmNewPassword },
    token,
  });
}

export const profileApi = { get, update, changePassword };
