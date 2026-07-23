import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { adminApi, type AdminUser } from '../../services/adminApi';

/**
 * Admin user management (User Story 8): list accounts and change role, deactivate/reactivate, or
 * delete each one. Delete is confirmed first, since it also removes that account's content and can't
 * be undone.
 */
export function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      setUsers(await adminApi.listUsers(token));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load users.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function changeRole(user: AdminUser) {
    // Toggle between the only two roles this app has.
    const nextRole = user.role === 'Admin' ? 'Author' : 'Admin';
    await adminApi.updateUserRole(user.id, nextRole, token);
    await loadUsers();
  }

  async function toggleStatus(user: AdminUser) {
    await adminApi.updateUserStatus(user.id, !user.isDeactivated, token);
    await loadUsers();
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Delete ${user.username}? This also deletes all their reviews and comments.`)) {
      return;
    }
    await adminApi.deleteUser(user.id, token);
    await loadUsers();
  }

  if (isLoading) {
    return <section className="panel"><p>Loading users…</p></section>;
  }

  return (
    <section className="panel">
      <h1>Users</h1>
      {errorMessage && <p role="alert" className="library__error">{errorMessage}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.isDeactivated ? 'Deactivated' : 'Active'}</td>
              <td>
                <button type="button" className="btn" onClick={() => changeRole(user)}>
                  Make {user.role === 'Admin' ? 'Author' : 'Admin'}
                </button>
                <button type="button" className="btn" onClick={() => toggleStatus(user)}>
                  {user.isDeactivated ? 'Reactivate' : 'Deactivate'}
                </button>
                <button type="button" className="btn" onClick={() => deleteUser(user)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
