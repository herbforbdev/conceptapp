"use client";

import React from 'react';
import { Card } from "flowbite-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { 
  HiUserGroup, 
  HiBell, 
  HiUser, 
  HiCog,
  HiArrowRight
} from "react-icons/hi";
import LanguageSelector from '@/components/shared/LanguageSelector';

export default function SettingsPage() {
  const { t: rawT } = useLanguage();
  // Safe t() to avoid rendering objects as React children
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

  const settingsCards = [
    {
      title: t('settings.Users & Roles'),
      description: t('settings.Manage user access and permissions'),
      icon: <HiUserGroup className="h-8 w-8 text-[#385e82]" />,
      href: "/dashboard/settings/users",
      color: "bg-gradient-to-br from-[#385e82] to-[#031b31]"
    },
    {
      title: t('settings.Notifications'),
      description: t('settings.Configure system notifications and alerts'),
      icon: <HiBell className="h-8 w-8 text-[#052c4f]" />,
      href: "/dashboard/settings/notifications",
      color: "bg-gradient-to-br from-[#052c4f] to-[#385e82]"
    },
    {
      title: t('settings.Profile Settings'),
      description: t('settings.Update your personal information and preferences'),
      icon: <HiUser className="h-8 w-8 text-[#1f4b72]" />,
      href: "/dashboard/settings/profile",
      color: "bg-gradient-to-br from-[#1f4b72] to-[#385e82]"
    },
    {
      title: t('settings.App Settings'),
      description: t('settings.Configure general application settings'),
      icon: <HiCog className="h-8 w-8 text-[#073763]" />,
      href: "/dashboard/settings",
      color: "bg-gradient-to-br from-[#073763] to-[#031b31]"
    }
  ];



  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('navigation.settings') || t('settings.Settings')}
        </h1>

        <Card className="mb-6">
          <h2 className="text-xl text-[#031b31] font-semibold mb-4">
            {t('settings.language')}
          </h2>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-700">
              {t('settings.selectLanguage')}:
            </label>
            <LanguageSelector />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {t('settings.languageDescription')}
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsCards.map((card, index) => (
            <Link key={index} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow duration-300 bg-white/80 border border-[#385e82]">
                <div className="flex items-start space-x-4">
                  <div className={`${card.color} text-white p-3 rounded-lg shadow-md`}>{card.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-[#031b31]">{card.title}</h3>
                    <p className="text-[#385e82] mb-4">{card.description}</p>
                    <div className="flex items-center text-[#385e82]">
                      <span className="text-sm font-semibold">{t('settings.Configure')}</span>
                      <HiArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* General Settings Section */}
        <Card className="mt-6 bg-white/80 border border-[#385e82]">
          <h2 className="text-xl font-semibold text-[#031b31] mb-4">{t('settings.General Settings')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
              <div>
                <h3 className="font-medium text-[#031b31]">{t('settings.Dark Mode')}</h3>
                <p className="text-sm text-[#385e82]">{t('settings.Toggle dark mode appearance')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-[#e2e8f0] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#385e82]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#385e82] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#385e82]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
              <div>
                <h3 className="font-medium text-[#031b31]">{t('settings.Email Notifications')}</h3>
                <p className="text-sm text-[#385e82]">{t('settings.Receive email notifications for important updates')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-[#e2e8f0] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#385e82]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#385e82] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#385e82]"></div>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 