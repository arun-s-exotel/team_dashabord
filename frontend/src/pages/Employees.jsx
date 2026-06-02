import { useState, useEffect } from 'react';
import { users, allowedEmails } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PRIMARY_ADMIN_EMAIL = 'arun.s@exotel.com';

export default function Employees() {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'employee' });
  const [addForm, setAddForm] = useState({ email: '', role: 'employee' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isPrimaryAdmin = currentUser?.email === PRIMARY_ADMIN_EMAIL;

  const loadAll = async () => {
    try {
      const [usersRes, whitelistRes] = await Promise.all([
        users.getAll(),
        allowedEmails.getAll()
      ]);
      setAllUsers(usersRes.data);
      setWhitelist(whitelistRes.data);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openAddModal = () => {
    setAddForm({ email: '', role: 'employee' });
    setError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setError('');
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name, role: user.role });
    setError('');
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setError('');
  };

  const handleAddEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (!addForm.email.toLowerCase().endsWith('@exotel.com')) {
        setError('Only @exotel.com emails are allowed');
        setSaving(false);
        return;
      }
      await allowedEmails.add({
        email: addForm.email.toLowerCase().trim(),
        role: isPrimaryAdmin ? addForm.role : 'employee'
      });
      closeAddModal();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add email');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updateData = { name: editForm.name };
      if (isPrimaryAdmin) updateData.role = editForm.role;
      await users.update(editingUser.id, updateData);
      closeEditModal();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = async (user) => {
    if (user.email === PRIMARY_ADMIN_EMAIL) {
      alert('Cannot remove the primary admin');
      return;
    }
    if (!window.confirm(`Remove ${user.name} from the team? Their account will be deactivated.`)) return;
    try {
      await users.delete(user.id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleRemoveWhitelist = async (entry) => {
    if (entry.registered) {
      if (!window.confirm(`${entry.email} has already registered. Removing them from the whitelist will not delete their account, but they will not be able to re-register if removed later. Continue?`)) return;
    } else {
      if (!window.confirm(`Remove pending invite for ${entry.email}?`)) return;
    }
    try {
      await allowedEmails.remove(entry.id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove from whitelist');
    }
  };

  const handleChangeWhitelistRole = async (entry, newRole) => {
    try {
      await allowedEmails.update(entry.id, { role: newRole });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const pendingInvites = whitelist.filter(w => !w.registered);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500 mt-1">Manage your team's accounts and invites</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold shadow-lg shadow-blue-500/25"
        >
          Add Email
        </button>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">How it works:</span> add an Exotel email here, then the teammate goes to the Register page and creates their own account. You never see or set their password.
        </p>
      </div>

      {isPrimaryAdmin && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-purple-800">Primary Admin</p>
              <p className="text-xs text-purple-600 mt-1">You can assign or revoke admin privileges for other team members and pending invites.</p>
            </div>
          </div>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-amber-50">
            <h2 className="text-sm font-semibold text-amber-900">Pending invites ({pendingInvites.length})</h2>
            <p className="text-xs text-amber-700 mt-0.5">These emails are whitelisted but haven't registered yet.</p>
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role on signup</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Added by</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingInvites.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">{entry.email}</td>
                  <td className="px-6 py-4">
                    {isPrimaryAdmin && entry.email !== PRIMARY_ADMIN_EMAIL ? (
                      <select
                        value={entry.role}
                        onChange={(e) => handleChangeWhitelistRole(entry, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        entry.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {entry.role === 'admin' ? 'Admin' : 'Employee'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{entry.addedBy}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleRemoveWhitelist(entry)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Registered members ({allUsers.length})</h2>
        </div>
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{user.name}</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                    {user.email === PRIMARY_ADMIN_EMAIL && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Employee'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => openEditModal(user)}
                    className="text-blue-600 hover:text-blue-800 font-medium mr-4"
                  >
                    Edit
                  </button>
                  {user.email !== PRIMARY_ADMIN_EMAIL && (
                    <button
                      onClick={() => handleRemoveUser(user)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Add Email to Whitelist</h2>
            <p className="text-sm text-slate-500 mb-4">The teammate will then register themselves at /register.</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAddEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Exotel Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                  placeholder="name@exotel.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role on signup</label>
                {isPrimaryAdmin ? (
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-sm">
                    Employee
                    <span className="text-xs text-slate-400 ml-2">(Only primary admin can pre-assign admin)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2.5 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium disabled:opacity-50 shadow-lg shadow-blue-500/25"
                >
                  {saving ? 'Saving...' : 'Add Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Member</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-sm">
                  {editingUser.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                {isPrimaryAdmin ? (
                  editingUser.email === PRIMARY_ADMIN_EMAIL ? (
                    <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600">
                      Admin (Primary - cannot change)
                    </div>
                  ) : (
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  )
                ) : (
                  <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600">
                    {editingUser.role === 'admin' ? 'Admin' : 'Employee'}
                    <span className="text-xs text-slate-400 ml-2">(Only primary admin can change roles)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2.5 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-medium disabled:opacity-50 shadow-lg shadow-blue-500/25"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
