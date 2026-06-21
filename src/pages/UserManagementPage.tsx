import React, { useEffect, useState } from 'react';
import { AuthService } from '../services/auth.service';
import type { UserProfile } from '../firebase/firestore';

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for creating a new user
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'super_admin' | 'admin' | 'issuer' | 'viewer'>('viewer');
  const [newOrg, setNewOrg] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // States for editing a user
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'super_admin' | 'admin' | 'issuer' | 'viewer'>('viewer');
  const [editOrg, setEditOrg] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all users
  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const usersList = await AuthService.adminListUsers();
      setUsers(usersList);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Failed to load users list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await AuthService.adminCreateUser(newEmail, newPassword, newName, newRole, newOrg);
      setSuccessMsg(`User "${newName}" registered successfully! Password: "${newPassword}"`);
      setShowCreateModal(false);
      // Reset form
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setNewRole('viewer');
      setNewOrg('');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to register new user.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (uid: string, currentDisabled: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await AuthService.adminToggleUserStatus(uid, !currentDisabled);
      setSuccessMsg(`User status updated successfully.`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to update user status.');
    }
  };

  const handleRoleChange = async (uid: string, role: UserProfile['role']) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await AuthService.adminChangeUserRole(uid, role);
      setSuccessMsg(`User role updated to ${role.replace('_', ' ')}.`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to update user role.');
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditOrg(user.org || '');
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsEditing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await AuthService.adminUpdateUserProfile(editingUser.uid, {
        name: editName,
        org: editOrg,
        role: editRole
      });
      setSuccessMsg(`User profile for "${editName}" updated successfully.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update user profile.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to delete user "${name}"? This will revoke all database profile mappings.`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await AuthService.adminDeleteUser(uid);
      setSuccessMsg(`User profile "${name}" deleted.`);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to delete user.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-sans text-xs">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-on-surface">User Management</h1>
          <p className="text-on-surface-variant mt-0.5 text-xs">Manage system user profiles, disable/enable accounts, and modify security roles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-secondary hover:opacity-90 active:scale-95 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          Create New User
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl p-3 font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-green-900 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* User Profiles Table */}
      <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
            <p className="text-on-surface-variant font-medium">Loading user profiles...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined text-4xl">manage_accounts</span>
            <p className="text-xs mt-2">No user accounts found in the database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  <th className="px-5 py-4">User Details</th>
                  <th className="px-5 py-4">Organisation</th>
                  <th className="px-5 py-4">Security Role</th>
                  <th className="px-5 py-4">Account Status</th>
                  <th className="px-5 py-4">Created Date</th>
                  <th className="px-5 py-4">Last Active</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-surface-container-low/55 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface text-xs">{u.name}</p>
                          <p className="text-[10px] text-on-surface-variant/80 mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant font-semibold">
                      {u.org || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as any)}
                        className="border border-outline-variant rounded px-2 py-1 bg-surface-container-low text-xs outline-none focus:ring-1 focus:ring-secondary font-semibold text-on-surface-variant"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="issuer">Issuer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[9px] ${
                        u.disabled 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {u.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="px-2 py-1 rounded border border-outline-variant text-on-surface hover:bg-surface-container-low font-bold flex items-center"
                          title="Edit User Details"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u.uid, !!u.disabled)}
                          className={`px-3 py-1 rounded border text-[10px] font-bold ${
                            u.disabled 
                              ? 'border-green-300 text-green-600 bg-green-50 hover:bg-green-100' 
                              : 'border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100'
                          }`}
                        >
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.uid, u.name)}
                          className="px-2 py-1 rounded border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-bold flex items-center"
                          title="Delete User"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Dialog Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-outline-variant p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-extrabold text-on-surface uppercase">Create New User Profile</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                  placeholder="john.doe@enterprise.com"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                  placeholder="Set temp password"
                />
                <button
                  type="button"
                  onClick={() => setNewPassword(Math.random().toString(36).slice(-8) + 'A1!')}
                  className="text-secondary font-bold text-[9px] hover:underline uppercase tracking-wider mt-1 block"
                >
                  Generate Password
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Security Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full rounded border border-outline-variant px-2 py-1.5 outline-none bg-surface-container-low text-xs font-semibold text-on-surface-variant"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="issuer">Issuer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Organisation (Optional)</label>
                  <input
                    type="text"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                    placeholder="CertForge Academy"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-outline rounded-lg py-2 font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-secondary text-white font-bold py-2 rounded-lg hover:opacity-90 active:scale-95 shadow-md"
                >
                  {isCreating ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Dialog Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-outline-variant p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-extrabold text-on-surface uppercase">Edit User Profile</h3>
              <button onClick={() => setEditingUser(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleEditUser} className="space-y-3.5">
              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Email Address (Read Only)</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none bg-surface-container text-on-surface-variant opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Security Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full rounded border border-outline-variant px-2 py-1.5 outline-none bg-surface-container-low text-xs font-semibold text-on-surface-variant"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="issuer">Issuer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[9px]">Organisation (Optional)</label>
                  <input
                    type="text"
                    value={editOrg}
                    onChange={(e) => setEditOrg(e.target.value)}
                    className="w-full rounded border border-outline-variant px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-secondary/55 bg-surface-container-low"
                    placeholder="CertForge Academy"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 border border-outline rounded-lg py-2 font-semibold hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 bg-secondary text-white font-bold py-2 rounded-lg hover:opacity-90 active:scale-95 shadow-md"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
