"use client";

import { useState, useEffect } from 'react';
import { Card, Button, TextInput, Label, Select, ToggleSwitch, Badge, Alert } from 'flowbite-react';
import { HiUser, HiMail, HiCalendar, HiShieldCheck, HiCog, HiLogout, HiUsers, HiPencil, HiCheck, HiX, HiLogin, HiPencilAlt, HiInformationCircle, HiRefresh } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { userService } from '@/services/firestore/userService';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, logout, updateUserProfile, userActivities, loadUserActivities, sessionId } = useAuth();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);

  // Phase 3: Enhanced profile fields
  const [enhancedProfile, setEnhancedProfile] = useState({
    phoneNumber: '',
    company: '',
    department: '',
    bio: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: false,
    language: 'fr',
    theme: 'light'
  });
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    if (user) {
      setEditData({
        displayName: user.displayName || '',
        email: user.email || ''
      });
      setEnhancedProfile(prev => ({
        ...prev,
        phoneNumber: user.phoneNumber || '',
        company: user.company || '',
        department: user.department || '',
        bio: user.bio || '',
        location: user.location || '',
        timezone: user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        emailNotifications: user.emailNotifications ?? true,
        pushNotifications: user.pushNotifications ?? true,
        weeklyReports: user.weeklyReports ?? false,
        language: user.language || 'fr',
        theme: user.theme || 'light'
      }));
    }
  }, [user]);

  useEffect(() => {
    const loadActiveSessions = async () => {
      if (user?.id) {
        try {
          const sessions = await userService.getActiveSessions(user.id);
          setActiveSessions(sessions);
        } catch (error) {
          console.error('Error loading active sessions:', error);
        }
      }
    };
    
    loadActiveSessions();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      await userService.updateUser(user.id, {
        displayName: editData.displayName,
        email: editData.email
      });
      setIsEditing(false);
      // You might want to refresh the auth context here
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      displayName: user?.displayName || '',
      email: user?.email || ''
    });
    setIsEditing(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEnhancedProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await updateUserProfile(enhancedProfile);
      if (success) {
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès!' });
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Jamais';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'login': return <HiLogin className="h-4 w-4 text-green-600" />;
      case 'logout': return <HiLogout className="h-4 w-4 text-red-600" />;
      case 'profile_update': return <HiPencilAlt className="h-4 w-4 text-blue-600" />;
      default: return <HiInformationCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'login': return 'Connexion';
      case 'logout': return 'Déconnexion';
      case 'profile_update': return 'Mise à jour du profil';
      case 'role_change': return 'Changement de rôle';
      case 'status_change': return 'Changement de statut';
      default: return action;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('profile.title') || 'Profil Utilisateur'}
        </h1>
        <p className="text-gray-600">
          {t('profile.subtitle') || 'Gérer vos informations personnelles et préférences'}
        </p>
      </motion.div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'profile', label: 'Profil', icon: HiUser },
            { id: 'security', label: 'Sécurité', icon: HiShieldCheck },
            { id: 'activity', label: 'Activité', icon: HiClock },
            { id: 'preferences', label: 'Préférences', icon: HiCog }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Informations Personnelles
                </h3>
                
                {/* Profile Photo and Basic Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <HiUser className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {user?.displayName || 'Utilisateur'}
                    </h3>
                    <p className="text-gray-600">{user?.email}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user?.role)}`}>
                      <HiShieldCheck className="h-3 w-3 mr-1" />
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleEnhancedProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="displayName" value="Nom complet" />
                      <TextInput
                        id="displayName"
                        value={enhancedProfile.displayName || user?.displayName || ''}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Votre nom complet"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber" value="Numéro de téléphone" />
                      <TextInput
                        id="phoneNumber"
                        value={enhancedProfile.phoneNumber}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="+243 XXX XXX XXX"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company" value="Entreprise" />
                      <TextInput
                        id="company"
                        value={enhancedProfile.company}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Nom de l'entreprise"
                      />
                    </div>
                    <div>
                      <Label htmlFor="department" value="Département" />
                      <TextInput
                        id="department"
                        value={enhancedProfile.department}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Département"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location" value="Localisation" />
                      <TextInput
                        id="location"
                        value={enhancedProfile.location}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Ville, Pays"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timezone" value="Fuseau horaire" />
                      <Select
                        id="timezone"
                        value={enhancedProfile.timezone}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, timezone: e.target.value }))}
                      >
                        <option value="Africa/Kinshasa">Afrique/Kinshasa (UTC+1)</option>
                        <option value="Africa/Lubumbashi">Afrique/Lubumbashi (UTC+2)</option>
                        <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                        <option value="UTC">UTC</option>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="bio" value="Biographie" />
                    <Textarea
                      id="bio"
                      rows={3}
                      value={enhancedProfile.bio}
                      onChange={(e) => setEnhancedProfile(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Une courte description de vous..."
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Historique d'Activité
                  </h3>
                  <Button
                    size="sm"
                    color="gray"
                    onClick={loadUserActivities}
                  >
                    <HiRefresh className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
                
                {userActivities?.length > 0 ? (
                  <div className="space-y-3">
                    {userActivities.map((activity, index) => (
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucune activité récente
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Sécurité du Compte
                </h3>
                
                {/* Account Info */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b">
                    <div>
                      <div className="font-medium">Dernière connexion</div>
                      <div className="text-sm text-gray-600">
                        {formatTimestamp(user?.lastLoginAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b">
                    <div>
                      <div className="font-medium">Nombre total de connexions</div>
                      <div className="text-sm text-gray-600">
                        {user?.totalLogins || 0} connexions
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b">
                    <div>
                      <div className="font-medium">Session actuelle</div>
                      <div className="text-sm text-gray-600">
                        {sessionId ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Sessions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Sessions Actives</h4>
                  {activeSessions?.length > 0 ? (
                    <div className="space-y-2">
                      {activeSessions.map((session, index) => (
                        <div key={session.id || index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <div className="font-medium">
                              {session.sessionId === sessionId ? 'Session actuelle' : 'Autre session'}
                            </div>
                            <div className="text-sm text-gray-600">
                              Démarrée: {formatTimestamp(session.startTime)}
                            </div>
                            <div className="text-sm text-gray-600">
                              Dernière activité: {formatTimestamp(session.lastActivity)}
                            </div>
                          </div>
                          <Badge color={session.sessionId === sessionId ? 'success' : 'warning'}>
                            {session.sessionId === sessionId ? 'Actuelle' : 'Active'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Aucune session active
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Préférences
                </h3>
                
                <form onSubmit={handleEnhancedProfileUpdate} className="space-y-6">
                  {/* Notification Preferences */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Notifications par email</div>
                          <div className="text-sm text-gray-600">Recevoir des notifications importantes par email</div>
                        </div>
                        <ToggleSwitch
                          checked={enhancedProfile.emailNotifications}
                          onChange={(checked) => setEnhancedProfile(prev => ({ ...prev, emailNotifications: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Notifications push</div>
                          <div className="text-sm text-gray-600">Recevoir des notifications dans le navigateur</div>
                        </div>
                        <ToggleSwitch
                          checked={enhancedProfile.pushNotifications}
                          onChange={(checked) => setEnhancedProfile(prev => ({ ...prev, pushNotifications: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Rapports hebdomadaires</div>
                          <div className="text-sm text-gray-600">Recevoir un résumé hebdomadaire des activités</div>
                        </div>
                        <ToggleSwitch
                          checked={enhancedProfile.weeklyReports}
                          onChange={(checked) => setEnhancedProfile(prev => ({ ...prev, weeklyReports: checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Language & Theme */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="language" value="Langue" />
                      <Select
                        id="language"
                        value={enhancedProfile.language}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, language: e.target.value }))}
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="theme" value="Thème" />
                      <Select
                        id="theme"
                        value={enhancedProfile.theme}
                        onChange={(e) => setEnhancedProfile(prev => ({ ...prev, theme: e.target.value }))}
                      >
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                        <option value="auto">Automatique</option>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Enregistrement...' : 'Enregistrer les préférences'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar - Stats and Quick Actions */}
        <div className="space-y-6">
          {/* User Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Statistiques
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Connexions totales</span>
                  <span className="font-semibold">{user?.totalLogins || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Compte créé</span>
                  <span className="font-semibold">
                    {user?.createdAt ? formatTimestamp(user.createdAt) : 'Inconnu'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Sessions actives</span>
                  <span className="font-semibold">{activeSessions?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Dernière activité</span>
                  <span className="font-semibold">
                    {user?.lastActiveAt ? formatTimestamp(user.lastActiveAt) : 'Maintenant'}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('profile.quickActions') || 'Quick Actions'}
            </h3>
            <div className="space-y-3">
              {user.role === 'admin' && (
                <Link href="/dashboard/settings/users">
                  <Button color="light" className="w-full justify-start">
                    <HiUsers className="h-5 w-5 mr-3" />
                    {t('settings.users') || 'Manage Users'}
                  </Button>
                </Link>
              )}
              
              <Link href="/dashboard/settings">
                <Button color="light" className="w-full justify-start">
                  <HiCog className="h-5 w-5 mr-3" />
                  {t('settings.title') || 'Settings'}
                </Button>
              </Link>
              
              <Button 
                color="failure" 
                className="w-full justify-start"
                onClick={logout}
              >
                <HiLogout className="h-5 w-5 mr-3" />
                {t('auth.logout') || 'Sign Out'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <motion.div
          className="fixed bottom-4 right-4 z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
        >
          <Alert
            color={message.type === 'success' ? 'success' : 'failure'}
            onDismiss={() => setMessage(null)}
          >
            <span className="font-medium">{message.text}</span>
          </Alert>
        </motion.div>
      )}
    </div>
  );
} 