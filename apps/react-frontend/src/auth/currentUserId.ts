/**
 * Reads the signed-in user's id out of their JWT, client-side.
 *
 * Why we need this: the UI shows "edit"/"delete" only on the user's OWN reviews/comments, so it must
 * know "who am I?" to compare against each item's authorId. The backend put the user id in the
 * token's `sub` claim at login (see TokenService), so we can decode it here without a server round-trip.
 *
 * Note: this is for DISPLAY decisions only. The server independently re-checks ownership on every
 * edit/delete, so a tampered token can't actually authorize anything — it would just show buttons
 * that then fail with a 403.
 */
export function getUserIdFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  try {
    // A JWT is three base64url parts: header.payload.signature — we want the payload's `sub`.
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as { sub?: string };
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}
