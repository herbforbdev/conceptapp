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
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t('navigation.settings') || t('settings.Settings')}
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Language Settings - Full width on mobile, 1/3 on xl screens */}
          <div className="xl:col-span-1">
            <Card className="h-fit bg-white/80 border border-[#385e82]">
              <h2 className="text-xl text-[#031b31] font-semibold mb-6">
                {t('settings.language')}
              </h2>
              <div className="flex flex-col gap-4">
                <label className="text-base text-gray-700 font-medium">
                  {t('settings.selectLanguage')}:
                </label>
                <LanguageSelector />
              </div>
              <p className="mt-4 text-sm text-gray-500">
                {t('settings.languageDescription')}
              </p>
            </Card>
          </div>

          {/* Settings Cards - 2/3 width on xl screens */}
          <div className="xl:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {settingsCards.map((card, index) => (
                <Link key={index} href={card.href}>
                  <Card className="hover:shadow-xl transition-all duration-300 bg-white/80 border border-[#385e82] h-full">
                    <div className="flex items-start space-x-4 h-full">
                      <div className={`${card.color} text-white p-4 rounded-xl shadow-md`}>{card.icon}</div>
                      <div className="flex-1 flex flex-col">
                        <h3 className="text-xl font-semibold mb-3 text-[#031b31]">{card.title}</h3>
                        <p className="text-[#385e82] mb-6 flex-grow">{card.description}</p>
                        <div className="flex items-center text-[#385e82] mt-auto">
                          <span className="text-base font-semibold">{t('settings.Configure')}</span>
                          <HiArrowRight className="ml-2 h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* General Settings Section - Full width */}
        <Card className="mt-8 bg-white/80 border border-[#385e82]">
          <h2 className="text-2xl font-semibold text-[#031b31] mb-6">{t('settings.General Settings')}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-6 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-[#031b31] mb-2">{t('settings.Dark Mode')}</h3>
                <p className="text-base text-[#385e82]">{t('settings.Toggle dark mode appearance')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-14 h-7 bg-[#e2e8f0] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#385e82]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#385e82] after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#385e82]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-6 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-[#031b31] mb-2">{t('settings.Email Notifications')}</h3>
                <p className="text-base text-[#385e82]">{t('settings.Receive email notifications for important updates')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-14 h-7 bg-[#e2e8f0] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#385e82]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#385e82] after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#385e82]"></div>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 