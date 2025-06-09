"use client";

import { Card, Button, TextInput, FileInput, Label, Alert } from "flowbite-react";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { HiOutlinePhotograph, HiKey, HiShieldCheck, HiLink } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    company: "",
    role: "",
    bio: "",
  });

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      // Implement profile update logic here
      setShowSuccessAlert(true);
      setIsEditing(false);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <a href="/dashboard/settings" className="inline-block bg-[#385e82] text-white rounded px-4 py-2 hover:bg-[#052c4f] transition">
          {t('settings.Back')}
        </a>
      </div>
      <h1 className="text-2xl font-bold mb-6">{t('settings.Profile Settings')}</h1>

      {showSuccessAlert && (
        <Alert color="success" className="mb-4">
          {t('settings.Profile updated successfully!')}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold mb-4">{t('settings.Profile Information')}</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">{t('settings.Full Name')}</Label>
                  <TextInput
                    id="displayName"
                    value={profileData.displayName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, displayName: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('settings.Email')}</Label>
                  <TextInput
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('settings.Phone Number')}</Label>
                  <TextInput
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label htmlFor="company">{t('settings.Company')}</Label>
                  <TextInput
                    id="company"
                    value={profileData.company}
                    onChange={(e) =>
                      setProfileData({ ...profileData, company: e.target.value })
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">{t('settings.Bio')}</Label>
                <textarea
                  id="bio"
                  rows={4}
                  className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData({ ...profileData, bio: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-end space-x-2">
                {isEditing ? (
                  <>
                    <Button type="submit" color="success">
                      {t('settings.Save Changes')}
                    </Button>
                    <Button color="gray" onClick={() => setIsEditing(false)}>
                      {t('settings.Cancel')}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>{t('settings.Edit Profile')}</Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-4">
          {/* Profile Photo */}
          <Card>
            <div className="text-center">
              <div className="mb-4">
                <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || 'Profile photo'}
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-full"
                    />
                  ) : (
                    <HiOutlinePhotograph className="h-12 w-12 text-gray-400" />
                  )}
                </div>
              </div>
              <FileInput
                id="profilePhoto"
                className="mb-2"
                accept="image/*"
              />
              <Button size="sm">{t('settings.Upload Photo')}</Button>
            </div>
          </Card>

          {/* Security Settings */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">{t('settings.Security')}</h3>
            <div className="space-y-4">
              <Button color="light" className="w-full text-left">
                <HiKey className="mr-2 h-5 w-5" />
                {t('settings.Change Password')}
              </Button>
              <Button color="light" className="w-full text-left">
                <HiShieldCheck className="mr-2 h-5 w-5" />
                {t('settings.Two-Factor Auth')}
              </Button>
            </div>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">{t('settings.Connected Accounts')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <HiLink className="mr-2 h-5 w-5" />
                  <span>{t('settings.Google')}</span>
                </div>
                <Button size="xs" color="light">{t('settings.Connect')}</Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <HiLink className="mr-2 h-5 w-5" />
                  <span>{t('settings.Microsoft')}</span>
                </div>
                <Button size="xs" color="light">{t('settings.Connect')}</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 