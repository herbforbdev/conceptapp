"use client";

import { Card, Table, Button, Modal, Label, TextInput, Select, Alert, Badge, Tabs } from "flowbite-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useFirestoreCollection } from "../../../../hooks/useFirestoreCollection";
import { HiOutlinePencilAlt, HiOutlineTrash, HiCheck, HiX, HiMail, HiClock, HiShieldCheck, HiUserAdd, HiRefresh, HiSearch, HiDownload, HiUsers } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/firestore/userService";
import { motion } from "framer-motion";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, loading: usersLoading, refetch: refetchUsers } = useFirestoreCollection("Users");
  const [accessRequests, setAccessRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [inviteForm, setInviteForm] = useState({ email: '', displayName: '', role: 'user' });
  const [editForm, setEditForm] = useState({ role: 'user', active: true });
  
  // Loading states
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Phase 3: Enhanced search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    active: '',
    company: '',
    department: ''
  });
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  // Phase 3: Bulk operations
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkUpdateData, setBulkUpdateData] = useState({
    role: '',
    active: true,
    company: '',
    department: ''
  });

  // Phase 3: User activities
  const [showUserActivities, setShowUserActivities] = useState(false);
  const [selectedUserActivities, setSelectedUserActivities] = useState([]);
  const [selectedUserForActivities, setSelectedUserForActivities] = useState(null);

  const roles = [
    { id: "admin", name: "Administrateur" },
    { id: "manager", name: "Gestionnaire" },
    { id: "user", name: "Utilisateur Standard" }
  ];

  const { t: rawT } = useLanguage?.() || { t: (x) => x };
  const t = (key) => {
    const value = rawT(key);
    if (typeof value === 'string' || typeof value === 'number') return value;
    return '';
  };

  // Check admin access
  const isAdmin = currentUser?.role === 'admin';

  // Phase 3: Filter users based on search and filters
  useEffect(() => {
    let isSubscribed = true;
    
    if (!users) return;
    
    let filtered = users.map(user => {
      const userData = typeof user.data === 'function' ? user.data() : user;
      return { ...userData, id: user.id || userData.id };
    });

    // Apply text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(term) ||
        user.displayName?.toLowerCase().includes(term) ||
        user.company?.toLowerCase().includes(term) ||
        user.department?.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    if (filters.active !== '') {
      filtered = filtered.filter(user => user.active === (filters.active === 'true'));
    }
    if (filters.company) {
      filtered = filtered.filter(user => user.company === filters.company);
    }
    if (filters.department) {
      filtered = filtered.filter(user => user.department === filters.department);
    }

    if (isSubscribed) {
      setFilteredUsers(filtered);
    }

    return () => {
      isSubscribed = false;
    };
  }, [users, searchTerm, filters]);

  // Fetch access requests
  useEffect(() => {
    let isSubscribed = true;
    
    const fetchAccessRequests = async () => {
      if (!isAdmin) return;
      
      try {
        const requests = await userService.getAccessRequests();
        if (isSubscribed) {
          setAccessRequests(requests);
          setLoadingRequests(false);
        }
      } catch (error) {
        console.error('Error fetching access requests:', error);
        if (isSubscribed) {
          setLoadingRequests(false);
        }
      }
    };

    fetchAccessRequests();

    return () => {
      isSubscribed = false;
    };
  }, [isAdmin]);

  // Get unique companies and departments for filter dropdowns
  const companies = [...new Set(users?.map(user => {
    const userData = typeof user.data === 'function' ? user.data() : user;
    return userData.company;
  }).filter(Boolean))];
  
  const departments = [...new Set(users?.map(user => {
    const userData = typeof user.data === 'function' ? user.data() : user;
    return userData.department;
  }).filter(Boolean))];

  // Phase 3: Bulk operations
  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map(user => user.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleBulkOperation = async () => {
    if (!selectedUserIds.length || !bulkAction) return;

    let isSubscribed = true;
    setActionLoading(true);
    setResult(null);

    try {
      switch (bulkAction) {
        case 'update_role':
          await userService.bulkUpdateUsers(
            selectedUserIds, 
            { role: bulkUpdateData.role },
            currentUser?.id
          );
          break;
        case 'update_status':
          await userService.bulkUpdateUsers(
            selectedUserIds, 
            { active: bulkUpdateData.active },
            currentUser?.id
          );
          break;
        case 'update_company':
          await userService.bulkUpdateUsers(
            selectedUserIds, 
            { company: bulkUpdateData.company },
            currentUser?.id
          );
          break;
        case 'update_department':
          await userService.bulkUpdateUsers(
            selectedUserIds, 
            { department: bulkUpdateData.department },
            currentUser?.id
          );
          break;
      }

      if (isSubscribed) {
        setResult({
          type: 'success',
          message: `${selectedUserIds.length} utilisateurs mis à jour avec succès!`
        });
        setSelectedUserIds([]);
        setActionLoading(false);
      }
    } catch (error) {
      console.error('Error in bulk operation:', error);
      if (isSubscribed) {
        setResult({
          type: 'error',
          message: 'Une erreur est survenue lors de la mise à jour des utilisateurs.'
        });
        setActionLoading(false);
      }
    }

    return () => {
      isSubscribed = false;
    };
  };

  // Phase 3: Export users
  const handleExportUsers = async () => {
    try {
      const exportData = await userService.exportUsers();
      const csv = convertToCSV(exportData);
      downloadCSV(csv, 'users-export.csv');
    } catch (error) {
      console.error('Error exporting users:', error);
      setResult({
        type: 'error',
        message: 'Erreur lors de l&apos;exportation des utilisateurs.'
      });
    }
  };

  // Handle view user activities
  const handleViewUserActivities = async (user) => {
    let isSubscribed = true;
    setActionLoading(true);
    
    try {
      const activities = await userService.getUserActivities(user.id);
      if (isSubscribed) {
        setSelectedUserActivities(activities);
        setSelectedUserForActivities(user);
        setShowUserActivities(true);
        setActionLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user activities:', error);
      if (isSubscribed) {
        setActionLoading(false);
      }
    }

    return () => {
      isSubscribed = false;
    };
  };

  // Utility functions
  const convertToCSV = (data) => {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Jamais';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  // Helper functions for user activities
  const getActionIcon = (action) => {
    switch (action) {
      case 'login':
        return <HiShieldCheck className="h-4 w-4 text-green-500" />;
      case 'logout':
        return <HiX className="h-4 w-4 text-gray-500" />;
      case 'profile_update':
        return <HiOutlinePencilAlt className="h-4 w-4 text-blue-500" />;
      case 'password_change':
        return <HiShieldCheck className="h-4 w-4 text-orange-500" />;
      case 'role_change':
        return <HiUsers className="h-4 w-4 text-purple-500" />;
      default:
        return <HiClock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'login':
        return 'Connexion à l\'application';
      case 'logout':
        return 'Déconnexion de l\'application';
      case 'profile_update':
        return 'Mise à jour du profil';
      case 'password_change':
        return 'Modification du mot de passe';
      case 'role_change':
        return 'Changement de rôle';
      default:
        return 'Activité inconnue';
    }
  };

  // Handle invite user
  const handleInviteUser = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setResult(null);

    try {
      // Check if user already exists
      const { user: existingUser } = await userService.isUserAuthorized(inviteForm.email);
      
      if (existingUser) {
        setResult({
          type: 'error',
          message: 'Un utilisateur avec cette adresse email existe déjà.'
        });
        setActionLoading(false);
        return;
      }

      // Create invitation
      await userService.inviteUser(
        inviteForm.email,
        inviteForm.displayName,
        currentUser?.id
      );

      setResult({
        type: 'success',
        message: 'Invitation envoyée avec succès!'
      });

      // Reset form and close modal
      setInviteForm({ email: '', displayName: '', role: 'user' });
      setIsInviteModalOpen(false);
      
      // Refresh data
      setTimeout(() => {
        refetchUsers();
        setResult(null);
      }, 2000);

    } catch (error) {
      console.error('Error inviting user:', error);
      setResult({
        type: 'error',
        message: 'Erreur lors de l\'envoi de l\'invitation.'
      });
    } finally {
    setActionLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    setResult(null);

    try {
      await userService.updateUser(selectedUser.id, {
        role: editForm.role,
        active: editForm.active
      });

      setResult({
        type: 'success',
        message: 'Utilisateur mis à jour avec succès!'
      });

      setIsEditModalOpen(false);
      setSelectedUser(null);
      
      // Refresh data
      setTimeout(() => {
        refetchUsers();
        setResult(null);
      }, 2000);

    } catch (error) {
      console.error('Error updating user:', error);
      setResult({
        type: 'error',
        message: 'Erreur lors de la mise à jour de l\'utilisateur.'
      });
    } finally {
    setActionLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) return;

    setActionLoading(true);
    setResult(null);

    try {
      await userService.deleteUser(userId);
      setResult({
        type: 'success',
        message: 'Utilisateur supprimé avec succès!'
      });
      
      setTimeout(() => {
        refetchUsers();
        setResult(null);
      }, 2000);

    } catch (error) {
      console.error('Error deleting user:', error);
      setResult({
        type: 'error',
        message: 'Erreur lors de la suppression de l\'utilisateur.'
      });
    } finally {
    setActionLoading(false);
    }
  };

  // Handle access request approval/rejection
  const handleAccessRequest = async (requestId, action, requestEmail, requestName) => {
    setActionLoading(true);
    setResult(null);

    try {
      if (action === 'approved') {
        // Create user account
        await userService.inviteUser(requestEmail, requestName, currentUser?.id);
      }
      
      // Update request status
      await userService.updateAccessRequest(requestId, action, currentUser?.id);

      setResult({
        type: 'success',
        message: `Demande ${action === 'approved' ? 'approuvée' : 'rejetée'} avec succès!`
      });

      // Refresh access requests
      const requests = await userService.getAccessRequests();
      setAccessRequests(requests);
      
      if (action === 'approved') {
        refetchUsers();
      }

      setTimeout(() => setResult(null), 3000);

    } catch (error) {
      console.error('Error handling access request:', error);
      setResult({
        type: 'error',
        message: 'Erreur lors du traitement de la demande.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle access request deletion
  const handleDeleteAccessRequest = async (requestId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande d\'accès?')) return;
    
    setActionLoading(true);
    setResult(null);

    try {
      await userService.deleteAccessRequest(requestId);
      
      setResult({
        type: 'success',
        message: 'Demande d\'accès supprimée avec succès!'
      });

      // Refresh access requests
      const requests = await userService.getAccessRequests();
      setAccessRequests(requests);

      setTimeout(() => setResult(null), 3000);
    } catch (error) {
      console.error('Error deleting access request:', error);
      setResult({
        type: 'error',
        message: 'Erreur lors de la suppression de la demande.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role || 'user',
      active: user.active !== undefined ? user.active : true
    });
    setIsEditModalOpen(true);
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (active) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert color="warning" icon={HiShieldCheck}>
          <span className="font-medium">Accès refusé!</span> Vous devez être administrateur pour accéder à cette page.
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600">Gérer les utilisateurs et les demandes d'accès</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleExportUsers}
            color="gray"
            size="sm"
          >
            <HiDownload className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button
            onClick={() => {
              refetchUsers();
              const fetchRequests = async () => {
                const requests = await userService.getAccessRequests();
                setAccessRequests(requests);
              };
              fetchRequests();
            }}
            color="gray"
            size="sm"
          >
            <HiRefresh className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button
            onClick={() => setIsInviteModalOpen(true)}
            size="sm"
            className="bg-blue-800 hover:bg-blue-900 text-white"
          >
            <HiUserAdd className="h-4 w-4 mr-2" />
            Inviter un utilisateur
          </Button>
        </div>
      </div>

      {/* Result Alert */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert
            color={result.type === 'success' ? 'success' : 'failure'}
            onDismiss={() => setResult(null)}
          >
            <span className="font-medium">{result.message}</span>
          </Alert>
        </motion.div>
      )}

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Recherche et Filtres</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label htmlFor="search" value="Rechercher" />
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <TextInput
                  id="search"
                  placeholder="Rechercher par nom, email, entreprise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <Label htmlFor="roleFilter" value="Rôle" />
              <Select
                id="roleFilter"
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="">Tous les rôles</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label htmlFor="statusFilter" value="Statut" />
              <Select
                id="statusFilter"
                value={filters.active}
                onChange={(e) => setFilters(prev => ({ ...prev, active: e.target.value }))}
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </Select>
            </div>

            {/* Company Filter */}
            <div>
              <Label htmlFor="companyFilter" value="Entreprise" />
              <Select
                id="companyFilter"
                value={filters.company}
                onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
              >
                <option value="">Toutes les entreprises</option>
                {companies.map(company => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Active filters display */}
          {(searchTerm || Object.values(filters).some(f => f)) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Filtres actifs:</span>
              {searchTerm && (
                <Badge color="blue">
                  Recherche: {searchTerm}
                </Badge>
              )}
              {filters.role && (
                <Badge color="purple">
                  Rôle: {String(roles.find(r => r.id === filters.role)?.name)}
                </Badge>
              )}
              {filters.active && (
                <Badge color="green">
                  Statut: {filters.active === 'true' ? 'Actif' : 'Inactif'}
                </Badge>
              )}
              {filters.company && (
                <Badge color="yellow">
                  Entreprise: {filters.company}
                </Badge>
              )}
              <Button
                size="xs"
                color="gray"
                onClick={() => {
                  setSearchTerm('');
                  setFilters({ role: '', active: '', company: '', department: '' });
                }}
              >
                Effacer les filtres
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Operations */}
      {selectedUserIds.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{selectedUserIds.length} utilisateur(s) sélectionné(s)</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <HiUsers className="h-4 w-4 mr-2" />
                Actions en lot
              </Button>
              <Button
                size="sm"
                color="gray"
                onClick={() => setSelectedUserIds([])}
              >
                Désélectionner tout
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Tabs
        className="border-b border-gray-200"
      >
        <Tabs.Item
          active
          title={
            <div className="flex items-center gap-2">
              <HiUsers className="h-5 w-5" />
              <span className="font-medium">Utilisateurs</span>
              <Badge color="blue" className="ml-2 bg-blue-800 text-white">{filteredUsers.length}</Badge>
            </div>
          }
        >
          <Card className="overflow-x-auto">
            <Table hoverable>
              <Table.Head>
                <Table.HeadCell>
                <input
                    type="checkbox"
                    checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </Table.HeadCell>
                <Table.HeadCell>Utilisateur</Table.HeadCell>
                <Table.HeadCell>Email</Table.HeadCell>
                <Table.HeadCell>Rôle</Table.HeadCell>
                <Table.HeadCell>Statut</Table.HeadCell>
                <Table.HeadCell>Entreprise</Table.HeadCell>
                <Table.HeadCell>Dernière connexion</Table.HeadCell>
                <Table.HeadCell>Actions</Table.HeadCell>
              </Table.Head>
              <Table.Body>
                {usersLoading ? (
                  <Table.Row>
                    <Table.Cell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Chargement...
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : filteredUsers.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={8} className="text-center py-8 text-gray-500">
                      Aucun utilisateur trouvé
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredUsers.map((user) => (
                    <Table.Row key={user.id} className="bg-white">
                      <Table.Cell>
                <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            {user.photoURL ? (
                              <Image
                                src={user.photoURL}
                                alt={user.displayName || 'User avatar'}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.displayName || 'Nom non défini'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.invited ? 'Invité' : 'Inscrit'}
                            </div>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>{user.email}</Table.Cell>
                      <Table.Cell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {String(roles.find(r => r.id === user.role)?.name || user.role)}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={user.active ? 'success' : 'failure'}>
                          {user.active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {user.company || '-'}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="text-sm text-gray-900">
                          {formatTimestamp(user.lastLoginAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.totalLogins || 0} connexions
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-2">
                          <Button
                            size="xs"
                            color="gray"
                            onClick={() => handleViewUserActivities(user)}
                            title="Voir l&apos;activité"
                          >
                            <HiClock className="h-3 w-3" />
                          </Button>
                          <Button
                            size="xs"
                            color="gray"
                            onClick={() => openEditModal(user)}
                            title="Modifier"
                          >
                            <HiOutlinePencilAlt className="h-3 w-3" />
                          </Button>
                          {user.role !== 'admin' && (
                            <Button
                              size="xs"
                              color="failure"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading}
                              title="Supprimer"
                            >
                              <HiOutlineTrash className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </Card>
        </Tabs.Item>

        {/* Access Requests Tab */}
        <Tabs.Item
          title={
            <div className="flex items-center gap-2">
              <HiMail className="h-5 w-5" />
              <span className="font-medium">Demandes d'accès</span>
              <Badge color="blue" className="ml-2">{accessRequests.filter(r => r.status === 'pending').length}</Badge>
            </div>
          }
        >
          <div className="mt-4">
            <Card className="overflow-x-auto">
              <Table hoverable>
                <Table.Head>
                  <Table.HeadCell>Demandeur</Table.HeadCell>
                  <Table.HeadCell>Email</Table.HeadCell>
                  <Table.HeadCell>Message</Table.HeadCell>
                  <Table.HeadCell>Date</Table.HeadCell>
                  <Table.HeadCell>Statut</Table.HeadCell>
                  <Table.HeadCell>Actions</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                  {loadingRequests ? (
                    <Table.Row>
                      <Table.Cell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Chargement...
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ) : accessRequests.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={6} className="text-center py-8 text-gray-500">
                        Aucune demande d'accès
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    accessRequests.map((request) => (
                      <Table.Row key={request.id}>
                        <Table.Cell className="font-medium text-gray-900">
                          {request.displayName}
                        </Table.Cell>
                        <Table.Cell>{request.email}</Table.Cell>
                        <Table.Cell>{request.message || '-'}</Table.Cell>
                        <Table.Cell>
                          {formatTimestamp(request.requestedAt)}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            color={
                              request.status === 'approved' ? 'success' :
                              request.status === 'rejected' ? 'failure' :
                              'warning'
                            }
                          >
                            {request.status === 'approved' ? 'Approuvée' :
                             request.status === 'rejected' ? 'Rejetée' :
                             'En attente'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-2">
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  size="xs"
                                  color="success"
                                  onClick={() => handleAccessRequest(request.id, 'approved', request.email, request.displayName)}
                                  disabled={actionLoading}
                                  title="Approuver"
                                >
                                  <HiCheck className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="xs"
                                  color="failure"
                                  onClick={() => handleAccessRequest(request.id, 'rejected', request.email, request.displayName)}
                                  disabled={actionLoading}
                                  title="Rejeter"
                                >
                                  <HiX className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {request.status === 'rejected' && (
                              <Button
                                size="xs"
                                color="failure"
                                onClick={() => handleDeleteAccessRequest(request.id)}
                                disabled={actionLoading}
                                title="Supprimer"
                              >
                                <HiOutlineTrash className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  )}
                </Table.Body>
              </Table>
            </Card>
          </div>
        </Tabs.Item>
      </Tabs>

      {/* Bulk Operations Modal */}
      <Modal show={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)}>
        <Modal.Header>Actions en lot ({selectedUserIds.length} utilisateurs)</Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulkAction" value="Action à effectuer" />
              <Select
                id="bulkAction"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                required
              >
                <option value="">Sélectionnez une action</option>
                <option value="update_role">Changer le rôle</option>
                <option value="update_status">Changer le statut</option>
                <option value="update_company">Changer l&apos;entreprise</option>
                <option value="update_department">Changer le département</option>
              </Select>
            </div>

            {bulkAction === 'update_role' && (
              <div>
                <Label htmlFor="bulkRole" value="Nouveau rôle" />
                <Select
                  id="bulkRole"
                  value={bulkUpdateData.role}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, role: e.target.value }))}
                  required
                >
                  <option value="">Sélectionnez un rôle</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {bulkAction === 'update_status' && (
              <div>
                <Label htmlFor="bulkStatus" value="Nouveau statut" />
                <Select
                  id="bulkStatus"
                  value={bulkUpdateData.active.toString()}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, active: e.target.value === 'true' }))}
                  required
                >
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </Select>
              </div>
            )}

            {bulkAction === 'update_company' && (
              <div>
                <Label htmlFor="bulkCompany" value="Nouvelle entreprise" />
                <TextInput
                  id="bulkCompany"
                  value={bulkUpdateData.company}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Nom de l&apos;entreprise"
                  required
                />
              </div>
            )}

            {bulkAction === 'update_department' && (
              <div>
                <Label htmlFor="bulkDepartment" value="Nouveau département" />
                <TextInput
                  id="bulkDepartment"
                  value={bulkUpdateData.department}
                  onChange={(e) => setBulkUpdateData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Nom du département"
                  required
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                color="gray"
                onClick={() => setIsBulkModalOpen(false)}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleBulkOperation}
                disabled={actionLoading || !bulkAction}
              >
                {actionLoading ? 'Traitement...' : 'Appliquer'}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* User Activities Modal */}
      <Modal show={showUserActivities} onClose={() => setShowUserActivities(false)} size="lg">
        <Modal.Header>
          Activité de {String(selectedUserForActivities?.displayName || selectedUserForActivities?.email)}
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedUserActivities.length > 0 ? (
              selectedUserActivities.map((activity, index) => (
                <div key={activity.id || index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {getActionText(activity.action)}
                    </div>
                    {activity.details && (
                      <div className="text-sm text-gray-600">
                        {activity.details}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucune activité trouvée
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Invite User Modal */}
      <Modal show={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)}>
        <Modal.Header>Inviter un utilisateur</Modal.Header>
        <Modal.Body>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div>
              <Label htmlFor="invite-email" value="Adresse email *" />
              <TextInput
                id="invite-email"
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="utilisateur@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-name" value="Nom complet" />
              <TextInput
                id="invite-name"
                type="text"
                value={inviteForm.displayName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Nom de l&apos;utilisateur"
              />
            </div>
            <div>
              <Label htmlFor="invite-role" value="Rôle" />
              <Select
                id="invite-role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
              >
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                color="gray"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={actionLoading}
              >
                {actionLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit User Modal */}
      <Modal show={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        <Modal.Header>Modifier l&apos;utilisateur</Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {(selectedUser.displayName || selectedUser.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {selectedUser.displayName || 'Nom non défini'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {selectedUser.email}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-role" value="Rôle" />
                <Select
                  id="edit-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-active" value="Statut" />
                <Select
                  id="edit-active"
                  value={editForm.active ? 'true' : 'false'}
                  onChange={(e) => setEditForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                >
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  color="gray"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={actionLoading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
} 