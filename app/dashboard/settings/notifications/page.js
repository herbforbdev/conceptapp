"use client";

import { Card, Button, ToggleSwitch, Select } from "flowbite-react";
import { useState } from "react";
import { HiBell, HiMail, HiPhone, HiDesktopComputer } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";

export default function NotificationsPage() {
  const [emailNotifications, setEmailNotifications] = useState({
    dailyDigest: true,
    weeklyReport: true,
    productUpdates: false,
    securityAlerts: true,
  });

  const [pushNotifications, setPushNotifications] = useState({
    newOrders: true,
    stockAlerts: true,
    systemUpdates: false,
    mentions: true,
  });

  const notificationCategories = [
    {
      title: "Email Notifications",
      icon: <HiMail className="h-6 w-6" />,
      description: "Configure how you receive email notifications",
      settings: [
        {
          id: "dailyDigest",
          label: "Daily Digest",
          description: "Receive a daily summary of all activities",
        },
        {
          id: "weeklyReport",
          label: "Weekly Report",
          description: "Get weekly performance and analytics reports",
        },
        {
          id: "productUpdates",
          label: "Product Updates",
          description: "Be notified about product inventory changes",
        },
        {
          id: "securityAlerts",
          label: "Security Alerts",
          description: "Receive notifications about security events",
        },
      ],
    },
    {
      title: "Push Notifications",
      icon: <HiBell className="h-6 w-6" />,
      description: "Manage your push notification preferences",
      settings: [
        {
          id: "newOrders",
          label: "New Orders",
          description: "Get notified when new orders are placed",
        },
        {
          id: "stockAlerts",
          label: "Stock Alerts",
          description: "Receive alerts for low stock items",
        },
        {
          id: "systemUpdates",
          label: "System Updates",
          description: "Be notified about system maintenance and updates",
        },
        {
          id: "mentions",
          label: "Mentions",
          description: "Notifications when you're mentioned in comments",
        },
      ],
    },
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

  const handleEmailToggle = (settingId) => {
    setEmailNotifications(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  const handlePushToggle = (settingId) => {
    setPushNotifications(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <a href="/dashboard/settings" className="inline-block bg-[#385e82] text-white rounded px-4 py-2 hover:bg-[#052c4f] transition">
          {t('settings.Back')}
        </a>
      </div>
      <h1 className="text-2xl font-bold mb-6">{t('settings.Notification Settings')}</h1>

      {/* Notification Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <HiMail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">{t('settings.Email Channel')}</h3>
              <p className="text-sm text-gray-600">example@email.com</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <HiPhone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">{t('settings.Mobile Push')}</h3>
              <p className="text-sm text-gray-600">iOS & Android</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <HiDesktopComputer className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">{t('settings.Desktop Push')}</h3>
              <p className="text-sm text-gray-600">Chrome & Firefox</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Notification Settings */}
      {notificationCategories.map((category, index) => (
        <Card className="mb-6" key={index}>
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              {category.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{t('settings.' + category.title)}</h2>
              <p className="text-gray-600">{t('settings.' + category.description)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {category.settings.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium">{t('settings.' + setting.label)}</h3>
                  <p className="text-sm text-gray-600">{t('settings.' + setting.description)}</p>
                </div>
                <ToggleSwitch
                  checked={
                    category.title === "Email Notifications"
                      ? emailNotifications[setting.id]
                      : pushNotifications[setting.id]
                  }
                  onChange={() =>
                    category.title === "Email Notifications"
                      ? handleEmailToggle(setting.id)
                      : handlePushToggle(setting.id)
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Notification Schedule */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">{t('settings.Quiet Hours')}</h2>
        <p className="text-gray-600 mb-4">
          {t("settings.Set a time period when you don't want to receive notifications")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">{t('settings.Start Time')}</Label>
            <Select id="startTime">
              {[...Array(24)].map((_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="endTime">{t('settings.End Time')}</Label>
            <Select id="endTime">
              {[...Array(24)].map((_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );
}

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
    {children}
  </label>
); 