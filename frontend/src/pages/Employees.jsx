import { useState, useEffect } from 'react';
import { users } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PRIMARY_ADMIN_EMAIL = 'arun.s@exotel.com';

export default function Employees() {
  const { user: currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isPrimaryAdmin = currentUser?.email === PRIMARY_ADMIN_EMAIL;

  const loadUsers = async () => {
    try {
      const res = await users.getAll();
      setAllUsers(res.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'employee' });
    }
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'employee' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editingUser) {
        const updateData = { name: formData.name };
        if (isPrimaryAdmin) {
          updateData.role = formData.role;
        }
        await users.update(editingUser.id, updateData);
      } else {
        if (!formData.password) {
          setError('Password is required for new employees');
          setSaving(false);
          return;
        }
        if (!formData.email.toLowerCase().endsWith('@exotel.com')) {
          setError('Only @exotel.com emails are allowed');
          setSaving(false);
          return;
        }
        await users.create({
          ...formData,
          email: formData.email.toLowerCase(),
          role: isPrimaryAdmin ? formData.role : 'employee'
        });
      }
      closeModal();
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.email === PRIMARY_ADMIN_EMAIL) {
      alert('Cannot remove the primary admin');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${user.name}?`)) return;

    try {
      await users.delete(user.id);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove employee');
    }
  };

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
          <p className="text-slate-500 mt-1">Manage your team's accounts</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold shadow-lg shadow-blue-500/25"
        >
          Add Member
        </button>
      </div>

      {/* Primary Admin Notice */}
      {isPrimaryAdmin && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-purple-800">Primary Admin</p>
              <p className="text-xs text-purple-600 mt-1">You can assign or revoke admin privileges for other team members.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                    onClick={() => openModal(user)}
                    className="text-blue-600 hover:text-blue-800 font-medium mr-4"
                  >
                    Edit
                  </button>
                  {user.email !== PRIMARY_ADMIN_EMAIL && (
                    <button
                      onClick={() => handleDelete(user)}
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
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{allUsers.length}</span> of 21 team slots used
          </p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingUser ? 'Edit Member' : 'Add Member'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Exotel Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="name@exotel.com"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* Role - Only primary admin can change */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                {isPrimaryAdmin ? (
                  <>
                    {editingUser?.email === PRIMARY_ADMIN_EMAIL ? (
                      <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600">
                        Admin (Primary - cannot change)
                      </div>
                    ) : (
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600">
                    {editingUser ? (editingUser.role === 'admin' ? 'Admin' : 'Employee') : 'Employee'}
                    <span className="text-xs text-slate-400 ml-2">(Only primary admin can change roles)</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
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
