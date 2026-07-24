import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { adminApi, type AdminUser } from '../../services/adminApi';
import './Admin.css';

type RoleFilter = 'all' | 'Admin' | 'Author';
type StatusFilter = 'all' | 'active' | 'deactivated';

/**
 * Admin user management (User Story 8). Lists accounts with quick filters and per-row controls:
 * pick a role and Save it, deactivate/reactivate, or delete. Delete is confirmed first since it also
 * removes that account's content and can't be undone.
 */
export function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // The role each row's <select> is currently showing (may differ from the saved role until Save).
  const [pendingRoles, setPendingRoles] = useState<Record<string, AdminUser['role']>>({});

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await adminApi.listUsers(token);
      setUsers(result);
      setPendingRoles(Object.fromEntries(result.map((u) => [u.id, u.role])));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load users.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function run(userId: string, action: () => Promise<unknown>) {
    setBusyId(userId);
    setErrorMessage('');
    try {
      await action();
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The action failed. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  function saveRole(user: AdminUser) {
    const nextRole = pendingRoles[user.id] ?? user.role;
    if (nextRole === user.role) return;
    void run(user.id, () => adminApi.updateUserRole(user.id, nextRole, token));
  }

  function toggleStatus(user: AdminUser) {
    void run(user.id, () => adminApi.updateUserStatus(user.id, !user.isDeactivated, token));
  }

  function deleteUser(user: AdminUser) {
    if (!window.confirm(`Delete ${user.username}? This also deletes all their reviews and comments.`)) {
      return;
    }
    void run(user.id, () => adminApi.deleteUser(user.id, token));
  }

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'Admin').length,
      members: users.filter((u) => u.role === 'Author').length,
    }),
    [users],
  );

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && u.isDeactivated) return false;
      if (statusFilter === 'deactivated' && !u.isDeactivated) return false;
      if (term && !u.username.toLowerCase().includes(term) && !u.email.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  return (
    <div className="adm">
      <Link to="/admin" className="adm__back">
        ← Back to dashboard
      </Link>

      <div className="adm__head">
        <div>
          <p className="adm__eyebrow">User Management</p>
          <h1 className="adm__title">Manage users in one place.</h1>
        </div>
      </div>

      <div className="adm-tiles">
        <div className="adm-tile adm-tile--accent">
          <p className="adm-tile__label">Total Users</p>
          <p className="adm-tile__value">{counts.total}</p>
        </div>
        <div className="adm-tile">
          <p className="adm-tile__label">Admins</p>
          <p className="adm-tile__value">{counts.admins}</p>
        </div>
        <div className="adm-tile">
          <p className="adm-tile__label">Members</p>
          <p className="adm-tile__value">{counts.members}</p>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="adm-error">
          {errorMessage}
        </p>
      )}

      <div className="adm-panel">
        <div className="adm-toolbar">
          <select
            className="adm-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            aria-label="Filter by role"
          >
            <option value="all">All Users</option>
            <option value="Admin">Admins</option>
            <option value="Author">Members</option>
          </select>
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
          <input
            className="adm-search"
            placeholder="Search username or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="adm-status">Loading users…</p>
        ) : visibleUsers.length === 0 ? (
          <div className="adm-empty">
            <p className="adm-empty__title">No users found.</p>
            <p className="adm-empty__hint">Try changing the filters or search.</p>
          </div>
        ) : (
          <ul className="adm-list">
            {visibleUsers.map((user) => (
              <li key={user.id} className="adm-row">
                <div className="adm-row__main">
                  <div className="adm-row__badges">
                    <span className="adm-badge">{user.role === 'Admin' ? 'Admin' : 'Member'}</span>
                    <span className={`adm-badge ${user.isDeactivated ? 'adm-badge--warn' : 'adm-badge--ok'}`}>
                      {user.isDeactivated ? 'Deactivated' : 'Active'}
                    </span>
                    <span className="adm-row__stamp">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="adm-row__name">{user.username}</p>
                  <p className="adm-row__sub">{user.email}</p>
                </div>

                <div className="adm-row__actions">
                  <select
                    className="adm-select adm-select--inline"
                    value={pendingRoles[user.id] ?? user.role}
                    onChange={(e) =>
                      setPendingRoles((prev) => ({
                        ...prev,
                        [user.id]: e.target.value as AdminUser['role'],
                      }))
                    }
                    disabled={busyId === user.id}
                    aria-label={`Role for ${user.username}`}
                  >
                    <option value="Author">Member</option>
                    <option value="Admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={() => saveRole(user)}
                    disabled={busyId === user.id || (pendingRoles[user.id] ?? user.role) === user.role}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={() => toggleStatus(user)}
                    disabled={busyId === user.id}
                  >
                    {user.isDeactivated ? 'Reactivate' : 'Deactivate'}
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    onClick={() => deleteUser(user)}
                    disabled={busyId === user.id}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
