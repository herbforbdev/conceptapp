"use client";

import { Card, Table, Button, Modal, Label, TextInput, Select } from "flowbite-react";
import { useState, useEffect } from "react";
import { useFirestoreCollection } from "../../../../hooks/useFirestoreCollection";
import { HiOutlinePencilAlt, HiOutlineTrash, HiPlus, HiCheck, HiX } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";
import { userService } from "@/services/firestore/userService";

export default function UsersPage() {
  const { data: users, loading } = useFirestoreCollection("Users");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ displayName: '', email: '', role: 'user', active: true });
  const [editUserId, setEditUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [usersList, setUsersList] = useState(users || []);

  const roles = [
    { id: "admin", name: "Administrator" },
    { id: "manager", name: "Manager" },
    { id: "user", name: "Standard User" }
  ];

  const { t: rawT } = useLanguage?.() || { t: (x) => x };
  const t = (key) => {
    const value = rawT(key);
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`Translation key '${key}' returned an object. Check your translation files for nested keys or missing leaf values.`);
      }
      return '';
    }
    return '';
  };

  // Fetch users on mount or after actions
  useEffect(() => {
    if (users) {
      setUsersList(
        users.map(u => {
          // If u.data is a function, it's a DocumentSnapshot; otherwise, it's a plain object
          const d = typeof u.data === 'function' ? u.data() : u;
          return {
            id: u.id || d.id, // fallback to d.id if needed
            displayName: d.displayName || d.name || '',
            email: d.email || '',
            role: d.role || 'user',
            active: typeof d.active === 'boolean' ? d.active : false,
            photoURL: d.photoURL || '',
            lastActive: d.lastActive,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        })
      );
    }
  }, [users]);

  // Add user (manual)
  const handleAddUser = async () => {
    setActionLoading(true);
    await userService.addUser(newUser);
    setNewUser({ displayName: '', email: '', role: 'user', active: true });
    setActionLoading(false);
  };

  // Edit user
  const handleSaveEditUser = async () => {
    setActionLoading(true);
    await userService.updateUser(editUserId, editUserData);
    setEditUserId(null);
    setEditUserData({});
    setActionLoading(false);
  };

  // Delete user
  const handleDeleteUserDb = async (userId) => {
    setActionLoading(true);
    await userService.deleteUser(userId);
    setActionLoading(false);
  };

  // Invite user
  const handleInviteUserDb = async (email, displayName) => {
    setActionLoading(true);
    await userService.inviteUser(email, displayName);
    setIsModalOpen(false);
    setSelectedUser(null);
    setActionLoading(false);
  };

  const handleInviteUser = () => {
    // Implement user invitation logic
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (userId) => {
    if (confirm("Are you sure you want to delete this user?")) {
      // Implement user deletion logic
    }
  };

  // Debug: Log users and usersList before rendering
  console.log('users:', users);
  console.log('usersList:', usersList);

  return (
    <div className="p-4">
      <div className="mb-4">
        <a href="/dashboard/settings" className="inline-block bg-[#385e82] text-white rounded px-4 py-2 hover:bg-[#052c4f] transition">
          {t('settings.Back')}
        </a>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('settings.Users & Roles')}</h1>
        <Button onClick={handleInviteUser} className="bg-[#385e82] text-white hover:bg-[#052c4f] border-none">
          <HiPlus className="mr-2 h-5 w-5" />
          {t('settings.Invite User')}
        </Button>
      </div>

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {roles.map((role) => (
          <Card key={role.id}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">{t('settings.' + role.name)}</h3>
              <p className="text-2xl font-bold text-blue-600">
                {users?.filter(user => user.role === role.id).length || 0}
              </p>
              <p className="text-gray-600">{t('settings.Users')}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card className="mt-4 bg-gradient-to-br from-[#385e82]/10 to-[#031b31]/5 border border-[#385e82] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rounded-2xl overflow-hidden shadow-md">
            <thead className="bg-[#031b31] text-white">
              <tr>
                <th className="px-4 py-3">{t('settings.User')}</th>
                <th className="px-4 py-3">{t('settings.Email')}</th>
                <th className="px-4 py-3">{t('settings.Role')}</th>
                <th className="px-4 py-3">{t('settings.Status')}</th>
                <th className="px-4 py-3">{t('settings.Created At')}</th>
                <th className="px-4 py-3">{t('settings.Updated At')}</th>
                <th className="px-4 py-3">{t('settings.Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {/* Add New User Row */}
              <tr className="bg-white">
                <td className="px-4 py-2">
                  <input
                    value={newUser.displayName}
                    onChange={e => setNewUser({ ...newUser, displayName: e.target.value })}
                    placeholder={t('settings.Full Name')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder={t('settings.Email')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{t('settings.' + role.name)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select
                    value={newUser.active ? 'active' : 'inactive'}
                    onChange={e => setNewUser({ ...newUser, active: e.target.value === 'active' })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                  >
                    <option value="active">{t('settings.Active')}</option>
                    <option value="inactive">{t('settings.Inactive')}</option>
                  </select>
                </td>
                <td className="px-4 py-2">-</td>
                <td className="px-4 py-2">-</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex space-x-2 justify-center">
                    <button onClick={handleAddUser} disabled={actionLoading} className="bg-[#385e82] text-white rounded-lg w-9 h-9 flex items-center justify-center hover:bg-[#052c4f] transition disabled:opacity-50" title={t('settings.Add User')}>
                      <HiPlus className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
              {/* Existing Users Rows */}
              {(loading || actionLoading) ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    {actionLoading ? t('settings.Saving…') : t('settings.Loading…')}
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    {t('settings.No Users Found')}
                  </td>
                </tr>
              ) : (
                usersList.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f4f7fa]'}>
                    <td className="px-4 py-2 font-medium">{user.displayName}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">
                      <span className={
                        'inline-block px-3 py-1 rounded-full text-xs font-semibold ' +
                        (user.role === 'admin'
                          ? 'bg-blue-700 text-white'
                          : user.role === 'manager'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-300 text-[#031b31]')
                      }>
                        {t('settings.' + (roles.find(r => r.id === user.role)?.name || user.role))}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={
                        'inline-block px-3 py-1 rounded-full text-xs font-semibold ' +
                        (user.active
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300')
                      }>
                        {user.active ? t('settings.Active') : t('settings.Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {user.createdAt && user.createdAt.toDate ? user.createdAt.toDate().toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {user.updatedAt && user.updatedAt.toDate ? user.updatedAt.toDate().toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex space-x-2 justify-center">
                        <button onClick={() => { setEditUserId(user.id); setEditUserData(user); }} className="bg-[#385e82] text-white rounded-lg w-9 h-9 flex items-center justify-center hover:bg-[#052c4f] transition" title={t('settings.Edit User')}>
                          <HiOutlinePencilAlt className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteUserDb(user.id)} disabled={actionLoading} className="bg-red-600 text-white rounded-lg w-9 h-9 flex items-center justify-center hover:bg-red-800 transition disabled:opacity-50" title={t('settings.Delete User')}>
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Modal */}
      <Modal show={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        setSelectedUser(null);
      }}>
        <Modal.Header>
          {selectedUser ? t('settings.Edit User') : t('settings.Invite New User')}
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-[#385e82]/10 to-[#b4c3d0]/10 border border-[#385e82]">
            <p className="font-semibold text-[#385e82] mb-2">{t('settings.Invite User')}</p>
            <p className="text-sm text-[#385e82]">{t('settings.Send an invitation to a new user by email. They will receive a link to join and set up their account.')}</p>
          </div>
          <form className="space-y-4">
            <div>
              <Label htmlFor="email">{t('settings.Email')}</Label>
              <TextInput
                id="email"
                type="email"
                placeholder="user@example.com"
                defaultValue={selectedUser?.email}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">{t('settings.Role')}</Label>
              <Select id="role" defaultValue={selectedUser?.role}>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {t('settings.' + role.name)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="submit" className="bg-[#385e82] text-white hover:bg-[#052c4f] border-none" onClick={async (e) => { e.preventDefault(); await handleInviteUserDb(document.getElementById('email').value, document.getElementById('displayName')?.value); }} disabled={actionLoading}>
                {selectedUser ? t('settings.Update User') : t('settings.Send Invitation')}
              </Button>
              <Button color="gray" onClick={() => setIsModalOpen(false)}>
                {t('settings.Cancel')}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
} 