import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as usersApi from '@api/users.js';
import { useAuth } from '../hooks/useAuth.js';

export default function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
  });

  const users = data?.users || [];

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">User Management</h2>
          <p className="text-sm text-surface-400 mt-0.5">
            Manage contributors and their access
          </p>
        </div>

        <CreateUserForm onCreated={() => qc.invalidateQueries({ queryKey: ['users'] })} />

        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-surface-400 text-sm">Loading…</div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-surface-400 text-sm">No users yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase hidden sm:table-cell">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase hidden md:table-cell">API Key</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase">Public</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {users.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isSelf={u.id === user?.id}
                    onRefresh={() => qc.invalidateQueries({ queryKey: ['users'] })}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateUserForm({ onCreated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newUser, setNewUser] = useState(null);

  const mutation = useMutation({
    mutationFn: (data) => usersApi.createUser(data),
    onSuccess: (data) => {
      setNewUser(data);
      setUsername('');
      setPassword('');
      onCreated();
      toast.success(`User "${data.username}" created`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create user');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username) return;
    mutation.mutate({ username, password: password || undefined, role: 'contributor' });
  };

  return (
    <div className="card p-5">
      <h3 className="font-medium text-surface-200 mb-4">Add Contributor</h3>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="label">Username</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. alice"
            value={username}
            onChange={e => setUsername(e.target.value)}
            pattern="[a-zA-Z0-9_\-]{2,32}"
            title="2-32 characters: letters, numbers, underscore, hyphen"
          />
        </div>
        <div className="flex-1">
          <label className="label">Password <span className="text-surface-600">(optional, auto-generated)</span></label>
          <input
            type="text"
            className="input font-mono"
            placeholder="Leave blank to auto-generate"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={mutation.isPending || !username}
          >
            {mutation.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>

      {/* Show newly created user credentials */}
      {newUser && (
        <div className="mt-4 p-3 rounded-lg bg-accent-500/10 border border-accent-500/30 text-sm">
          <p className="font-medium text-accent-400 mb-2">User created — share these credentials:</p>
          <div className="space-y-1 font-mono text-xs text-surface-300">
            <p><span className="text-surface-500">Username:</span> {newUser.username}</p>
            {newUser.generated_password && (
              <p><span className="text-surface-500">Password:</span> {newUser.generated_password}</p>
            )}
            {newUser.api_key && (
              <p className="flex items-center gap-2">
                <span className="text-surface-500">API Key:</span>
                <span className="truncate">{newUser.api_key}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(newUser.api_key); toast.success('Copied!'); }}
                  className="shrink-0 text-accent-400 hover:text-accent-300 text-xs"
                >
                  Copy
                </button>
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-surface-500">Save these credentials — the password won't be shown again.</p>
          <button onClick={() => setNewUser(null)} className="mt-1 text-xs text-surface-500 hover:text-surface-300">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function UserRow({ user, isSelf, onRefresh }) {
  const [showKey, setShowKey] = useState(false);

  const togglePublicMutation = useMutation({
    mutationFn: () => usersApi.updateUser(user.id, { is_public: !user.is_public }),
    onSuccess: onRefresh,
    onError: () => toast.error('Failed to update'),
  });

  const rotateMutation = useMutation({
    mutationFn: () => usersApi.rotateApiKey(user.id),
    onSuccess: (data) => {
      toast.success('API key rotated');
      navigator.clipboard.writeText(data.api_key).catch(() => {});
      onRefresh();
    },
    onError: () => toast.error('Failed to rotate key'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteUser(user.id),
    onSuccess: () => {
      toast.success('User deleted');
      onRefresh();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  return (
    <tr className="hover:bg-surface-800/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center text-xs font-medium">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-surface-200">{user.username}</p>
            <p className="text-xs text-surface-500">{user.folder_name}</p>
          </div>
          {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700 text-surface-400">you</span>}
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          user.role === 'admin'
            ? 'bg-amber-500/20 text-amber-400'
            : 'bg-surface-700 text-surface-400'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {user.api_key ? (
          <div className="flex items-center gap-1.5">
            <code className="text-xs text-surface-400 font-mono">
              {showKey ? user.api_key : `${user.api_key.slice(0, 8)}…`}
            </code>
            <button
              onClick={() => setShowKey(s => !s)}
              className="text-[10px] text-surface-500 hover:text-surface-300"
            >
              {showKey ? 'hide' : 'show'}
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(user.api_key); toast.success('Copied!'); }}
              className="text-[10px] text-accent-500 hover:text-accent-400"
            >
              copy
            </button>
            <button
              onClick={() => rotateMutation.mutate()}
              disabled={rotateMutation.isPending}
              className="text-[10px] text-surface-500 hover:text-surface-300"
            >
              rotate
            </button>
          </div>
        ) : (
          <span className="text-xs text-surface-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {user.role !== 'admin' && (
          <button
            onClick={() => togglePublicMutation.mutate()}
            disabled={togglePublicMutation.isPending}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              user.is_public ? 'bg-accent-500' : 'bg-surface-700'
            }`}
            aria-label={user.is_public ? 'Set to private' : 'Set to public'}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              user.is_public ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {!isSelf && user.role !== 'admin' && (
          <button
            onClick={() => {
              if (confirm(`Delete user "${user.username}"?`)) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}
