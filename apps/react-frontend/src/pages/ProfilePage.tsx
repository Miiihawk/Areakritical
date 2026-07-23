import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { profileApi, type Profile } from '../services/profileApi';

/**
 * The profile page (User Story 6). A read-first profile card — identity, role, and account
 * details pulled live from the database — with editing (display name / bio) and the password
 * change tucked behind an "Edit Profile" toggle so the default view stays clean.
 */
export function ProfilePage() {
  const { token, role } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Profile-details form state.
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password-change form state.
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const result = await profileApi.get(token);
        if (!active) return;
        setProfile(result);
        setDisplayName(result.displayName ?? '');
        setBio(result.bio ?? '');
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load your profile.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    // Guard against setting state after unmount / token change mid-flight.
    return () => {
      active = false;
    };
  }, [token]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');
    try {
      const updated = await profileApi.update({ displayName, bio }, token);
      setProfile(updated);
      setProfileMessage('Profile updated.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save your profile.');
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    // Match the two fields client-side first, for a faster message; the server checks again.
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      await profileApi.changePassword(newPassword, confirmNewPassword, token);
      setPasswordMessage('Password changed. Your other sessions stay signed in until they expire.');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Could not change your password.');
    }
  }

  if (isLoading) {
    return (
      <div className="profile-shell">
        <section className="panel"><p>Loading profile…</p></section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="profile-shell">
        <section className="panel">
          <p role="alert" className="library__error">{loadError}</p>
        </section>
      </div>
    );
  }

  const shownName = profile?.displayName?.trim() || profile?.username || 'Your profile';
  const initials = shownName.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'AK';

  return (
    <div className="profile-shell">
      <Link to="/dashboard" className="profile-back">
        <span aria-hidden="true">←</span> Back to Dashboard
      </Link>

      <section className="profile-card">
        {/* ---- identity header ---- */}
        <header className="profile-card__head">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div className="profile-card__id">
            <span className={`profile-badge ${role === 'Admin' ? 'profile-badge--admin' : ''}`}>
              <span aria-hidden="true">◈</span> {role ?? 'Member'}
            </span>
            <h1 className="profile-card__name">{shownName}</h1>
            <p className="profile-card__handle">@{profile?.username}</p>
          </div>
        </header>

        {/* ---- stat tiles ---- */}
        <ul className="profile-stats">
          <li className="profile-stat">
            <strong>0</strong>
            <span>Completed</span>
          </li>
          <li className="profile-stat">
            <strong>0</strong>
            <span>Reviewing</span>
          </li>
          <li className="profile-stat">
            <strong>0</strong>
            <span>Favorites</span>
          </li>
        </ul>

        {/* ---- account details (read view) ---- */}
        <div className="profile-details">
          <p className="profile-section-title">Account Details</p>

          <div className="profile-field">
            <span className="profile-field__icon" aria-hidden="true">☺</span>
            <div>
              <span className="profile-field__label">Display Name</span>
              <p className="profile-field__value">{profile?.displayName?.trim() || profile?.username}</p>
            </div>
          </div>

          <div className="profile-field">
            <span className="profile-field__icon" aria-hidden="true">✉</span>
            <div>
              <span className="profile-field__label">Email Address</span>
              <p className="profile-field__value">{profile?.email}</p>
            </div>
          </div>

          {profile?.bio?.trim() && (
            <div className="profile-field">
              <span className="profile-field__icon" aria-hidden="true">✎</span>
              <div>
                <span className="profile-field__label">Bio</span>
                <p className="profile-field__value">{profile.bio}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn--cta profile-edit-toggle"
            onClick={() => setIsEditing((open) => !open)}
          >
            <span aria-hidden="true">✎</span> {isEditing ? 'Close editor' : 'Edit Profile'}
          </button>
        </div>

        {/* ---- edit forms (revealed on demand) ---- */}
        {isEditing && (
          <div className="profile-editor">
            <form className="profile__form" onSubmit={handleProfileSave}>
              <h2>Details</h2>
              <label>
                <span>Display name</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
              <label>
                <span>Bio</span>
                <textarea rows={3} value={bio} onChange={(event) => setBio(event.target.value)} />
              </label>

              {profileError && <p role="alert" className="library__error">{profileError}</p>}
              {profileMessage && <p className="profile__ok">{profileMessage}</p>}

              <button type="submit" className="btn btn--cta">Save details</button>
            </form>

            <form className="profile__form" onSubmit={handlePasswordChange}>
              <h2>Change password</h2>
              <label>
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label>
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                />
              </label>

              {passwordError && <p role="alert" className="library__error">{passwordError}</p>}
              {passwordMessage && <p className="profile__ok">{passwordMessage}</p>}

              <button type="submit" className="btn btn--cta">Change password</button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
