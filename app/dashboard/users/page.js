"use client";

import { useState, useEffect } from "react";
import { Card, Button, Table } from "flowbite-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { useLanguage } from "@/context/LanguageContext";
import { HiCheck, HiX, HiTrash, HiPencil } from "react-icons/hi";

export default function UsersPage() {
  const { t } = useLanguage();
  const { data: users, loading, refetch } = useFirestoreCollection("Users");
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState("");

  const handleApproveUser = async (userId) => {
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        status: 'active',
        approved: true
      });
      refetch();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    if (userRole === 'admin') {
      alert('Admin users cannot be deleted.');
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      const userRef = doc(firestore, 'users', userId);
      await deleteDoc(userRef);
      refetch();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleSaveRole = async (userId) => {
    if (!newRole) return;
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        role: newRole
      });
      setEditingUser(null);
      setNewRole("");
      refetch();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <Card>
        <h1 className="text-2xl font-bold mb-4">{t('users.title', 'Users Management')}</h1>
        <Table>
          <Table.Head>
            <Table.HeadCell>Name</Table.HeadCell>
            <Table.HeadCell>Email</Table.HeadCell>
            <Table.HeadCell>Role</Table.HeadCell>
            <Table.HeadCell>Status</Table.HeadCell>
            <Table.HeadCell>Actions</Table.HeadCell>
          </Table.Head>
          <Table.Body className="divide-y">
            {users?.map((user) => (
              <Table.Row key={user.id}>
                <Table.Cell>{user.displayName || user.name || 'N/A'}</Table.Cell>
                <Table.Cell>{user.email}</Table.Cell>
                <Table.Cell>
                  {editingUser === user.id ? (
                    <select
                      value={newRole || user.role}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    user.role || 'user'
                  )}
                </Table.Cell>
                <Table.Cell>
                  {user.approved ? (
                    <span className="text-green-600">Approved</span>
                  ) : (
                    <span className="text-yellow-600">Pending</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    {!user.approved && (
                      <Button
                        size="sm"
                        color="success"
                        onClick={() => handleApproveUser(user.id)}
                      >
                        <HiCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {editingUser === user.id ? (
                      <>
                        <Button
                          size="sm"
                          color="success"
                          onClick={() => handleSaveRole(user.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          color="gray"
                          onClick={() => {
                            setEditingUser(null);
                            setNewRole("");
                          }}
                        >
                          <HiX className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        color="blue"
                        onClick={() => {
                          setEditingUser(user.id);
                          setNewRole(user.role || 'user');
                        }}
                      >
                        <HiPencil className="h-4 w-4" />
                      </Button>
                    )}
                    {user.role !== 'admin' && (
                      <Button
                        size="sm"
                        color="failure"
                        onClick={() => handleDeleteUser(user.id, user.role)}
                      >
                        <HiTrash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Card>
    </div>
  );
}