"use client";

import { useState, useEffect } from 'react';
import { Card, Button, TextInput, Label } from 'flowbite-react';
import { HiUser, HiMail, HiCalendar, HiShieldCheck, HiCog, HiLogout, HiUsers, HiPencil, HiCheck, HiX } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { userService } from '@/services/firestore/userService';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    email: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setEditData({
        displayName: user.displayName || '',
        email: user.email || ''
      });
    }
  }, [user]);

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('profile.title') || 'User Profile'}
        </h1>
        <p className="text-gray-600">
          {t('profile.subtitle') || 'Manage your account information and preferences'}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('profile.personalInfo') || 'Personal Information'}
              </h2>
              {!isEditing ? (
                <Button
                  size="sm"
                  color="light"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <HiPencil className="h-4 w-4" />
                  {t('common.edit') || 'Edit'}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="success"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <HiCheck className="h-4 w-4" />
                    {saving ? 'Saving...' : (t('common.save') || 'Save')}
                  </Button>
                  <Button
                    size="sm"
                    color="light"
                    onClick={handleCancel}
                    className="flex items-center gap-2"
                  >
                    <HiX className="h-4 w-4" />
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Photo */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {user.photoURL ? (
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
                  {user.displayName || 'User'}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                  <HiShieldCheck className="h-3 w-3 mr-1" />
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'User'}
                </span>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName" value={t('profile.displayName') || 'Display Name'} />
                {isEditing ? (
                  <TextInput
                    id="displayName"
                    value={editData.displayName}
                    onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter your display name"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{user.displayName || 'Not set'}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email" value={t('profile.email') || 'Email Address'} />
                {isEditing ? (
                  <TextInput
                    id="email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{user.email}</p>
                )}
              </div>

              <div>
                <Label value={t('profile.accountCreated') || 'Account Created'} />
                <p className="mt-1 text-gray-600 flex items-center gap-2">
                  <HiCalendar className="h-4 w-4" />
                  {formatDate(user.metadata?.creationTime)}
                </p>
              </div>

              <div>
                <Label value={t('profile.lastSignIn') || 'Last Sign In'} />
                <p className="mt-1 text-gray-600 flex items-center gap-2">
                  <HiCalendar className="h-4 w-4" />
                  {formatDate(user.metadata?.lastSignInTime)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Account Settings */}
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

          {/* Account Stats */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('profile.accountInfo') || 'Account Information'}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('profile.accountType') || 'Account Type'}:</span>
                <span className="font-medium">{user.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('profile.verified') || 'Email Verified'}:</span>
                <span className={`font-medium ${user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {user.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('profile.uid') || 'User ID'}:</span>
                <span className="font-mono text-xs text-gray-500">{user.uid?.slice(0, 8)}...</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 