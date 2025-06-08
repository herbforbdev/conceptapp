'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Alert, Badge, Label, Toggle } from 'flowbite-react';
import { HiBell, HiMail, HiCog, HiCheck, HiExclamation } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/services/firestore/notificationService';

export default function NotificationPreferencesPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    inventoryAlerts: true,
    budgetAlerts: true,
    userManagementAlerts: true,
    systemAlerts: true
  });

  useEffect(() => {
    if (currentUser) {
      loadPreferences();
    }
  }, [currentUser]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const userPrefs = await notificationService.getUserNotificationPreferences(currentUser.uid);
      if (userPrefs) {
        setPreferences({
          emailNotifications: userPrefs.emailNotifications ?? true,
          pushNotifications: userPrefs.pushNotifications ?? true,
          weeklyReports: userPrefs.weeklyReports ?? true,
          inventoryAlerts: userPrefs.inventoryAlerts ?? true,
          budgetAlerts: userPrefs.budgetAlerts ?? true,
          userManagementAlerts: userPrefs.userManagementAlerts ?? true,
          systemAlerts: userPrefs.systemAlerts ?? true
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des préférences' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const success = await notificationService.updateNotificationPreferences(
        currentUser.uid,
        preferences
      );

      if (success) {
        setMessage({ type: 'success', text: 'Préférences sauvegardées avec succès!' });
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde des préférences' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const preferenceCategories = [
    {
      title: 'Notifications Générales',
      icon: <HiBell className="h-5 w-5" />,
      description: 'Paramètres généraux des notifications',
      items: [
        {
          key: 'emailNotifications',
          label: 'Notifications par Email',
          description: 'Recevoir des notifications par email',
          icon: <HiMail className="h-4 w-4 text-blue-600" />
        },
        {
          key: 'pushNotifications',
          label: 'Notifications Push',
          description: 'Recevoir des notifications dans le navigateur',
          icon: <HiBell className="h-4 w-4 text-green-600" />
        }
      ]
    },
    {
      title: 'Alertes Système',
      icon: <HiExclamation className="h-5 w-5" />,
      description: 'Alertes importantes du système',
      items: [
        {
          key: 'inventoryAlerts',
          label: 'Alertes de Stock',
          description: 'Recevoir des alertes pour les stocks faibles',
          icon: <div className="h-4 w-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs">📦</div>
        },
        {
          key: 'budgetAlerts',
          label: 'Alertes Budgétaires',
          description: 'Recevoir des alertes de dépassement de budget',
          icon: <div className="h-4 w-4 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs">💰</div>
        },
        {
          key: 'systemAlerts',
          label: 'Alertes Système',
          description: 'Recevoir des alertes système importantes',
          icon: <HiCog className="h-4 w-4 text-gray-600" />
        }
      ]
    },
    {
      title: 'Gestion des Utilisateurs',
      icon: <div className="h-5 w-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">👥</div>,
      description: 'Notifications liées à la gestion des utilisateurs',
      items: [
        {
          key: 'userManagementAlerts',
          label: 'Gestion Utilisateurs',
          description: 'Invitations, demandes d\'accès, changements de rôle',
          icon: <div className="h-4 w-4 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">👤</div>
        }
      ]
    },
    {
      title: 'Rapports et Analyses',
      icon: <div className="h-5 w-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">📊</div>,
      description: 'Rapports périodiques et analyses',
      items: [
        {
          key: 'weeklyReports',
          label: 'Rapports Hebdomadaires',
          description: 'Recevoir un résumé hebdomadaire de l\'activité',
          icon: <div className="h-4 w-4 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">📈</div>
        }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Chargement des préférences...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <HiBell className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Préférences de Notification</h1>
            <p className="text-gray-600">Gérez vos préférences de notification et d'email</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mt-4">
          <Badge color={preferences.emailNotifications ? "success" : "warning"}>
            {preferences.emailNotifications ? "Emails activés" : "Emails désactivés"}
          </Badge>
          <Badge color={preferences.pushNotifications ? "success" : "gray"}>
            {preferences.pushNotifications ? "Push activées" : "Push désactivées"}
          </Badge>
        </div>
      </div>

      {/* Message */}
      {message && (
        <Alert 
          color={message.type === 'success' ? 'success' : 'failure'} 
          className="mb-6"
          onDismiss={() => setMessage(null)}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? 
              <HiCheck className="h-4 w-4" /> : 
              <HiExclamation className="h-4 w-4" />
            }
            <span>{message.text}</span>
          </div>
        </Alert>
      )}

      {/* Preference Categories */}
      <div className="space-y-6">
        {preferenceCategories.map((category, categoryIndex) => (
          <Card key={categoryIndex}>
            <div className="p-6">
              {/* Category Header */}
              <div className="flex items-start gap-3 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {category.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>

              {/* Preference Items */}
              <div className="space-y-4">
                {category.items.map((item, itemIndex) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      {item.icon}
                      <div>
                        <Label className="font-medium text-gray-900">{item.label}</Label>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Toggle
                        checked={preferences[item.key]}
                        onChange={(checked) => handlePreferenceChange(item.key, checked)}
                        disabled={!preferences.emailNotifications && item.key !== 'emailNotifications' && item.key !== 'pushNotifications'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Master Email Toggle Warning */}
      {!preferences.emailNotifications && (
        <Alert color="warning" className="mt-6">
          <div className="flex items-center gap-2">
            <HiExclamation className="h-4 w-4" />
            <span>
              <strong>Attention:</strong> Les notifications par email sont désactivées. 
              Vous ne recevrez aucun email, même si les alertes spécifiques sont activées.
            </span>
          </div>
        </Alert>
      )}

      {/* Email Service Status */}
      <Card className="mt-6">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HiMail className="h-5 w-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Service Email</h4>
                <p className="text-sm text-gray-600">
                  {process.env.NODE_ENV === 'development' 
                    ? 'Mode développement - Emails simulés dans la console'
                    : 'Service de messagerie configuré et actif'
                  }
                </p>
              </div>
            </div>
            <Badge color={process.env.NODE_ENV === 'development' ? 'warning' : 'success'}>
              {process.env.NODE_ENV === 'development' ? 'Simulation' : 'Actif'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end mt-8">
        <Button 
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sauvegarde...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <HiCheck className="h-4 w-4" />
              Sauvegarder les Préférences
            </div>
          )}
        </Button>
      </div>

      {/* Info Section */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <div className="p-4">
          <h4 className="font-medium text-blue-900 mb-2">ℹ️ À propos des notifications</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Les notifications sont envoyées en temps réel selon vos préférences</li>
            <li>• Les emails sont envoyés depuis une adresse non-surveillée (noreply)</li>
            <li>• Vous pouvez modifier ces préférences à tout moment</li>
            <li>• Les alertes critiques peuvent contourner certains paramètres</li>
          </ul>
        </div>
      </Card>
    </div>
  );
} 