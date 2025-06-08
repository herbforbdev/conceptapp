"use client";

import { useLanguage } from '@/context/LanguageContext';
import { Card, Button } from 'flowbite-react';

export default function DebugTranslations() {
  const { language, setLanguage, t, translations } = useLanguage();

  const testKeys = [
    'profile.title',
    'profile.subtitle', 
    'profile.personalInfo',
    'profile.quickActions',
    'profile.accountInfo',
    'settings.users',
    'auth.logout'
  ];

  const clearStorage = () => {
    localStorage.removeItem('language');
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <h1 className="text-2xl font-bold mb-4">Translation Debug</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Current Language:</strong> {language}
          </div>
          
          <div>
            <strong>Available Languages:</strong> {Object.keys(translations).join(', ')}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setLanguage('en')} color={language === 'en' ? 'success' : 'light'}>
              Set English
            </Button>
            <Button onClick={() => setLanguage('fr')} color={language === 'fr' ? 'success' : 'light'}>
              Set French
            </Button>
            <Button onClick={clearStorage} color="failure">
              Clear Storage & Reload
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Translation Test:</h3>
            <div className="space-y-2">
              {testKeys.map(key => (
                <div key={key} className="p-2 bg-gray-50 rounded">
                  <strong>{key}:</strong> <span className="text-blue-600">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Raw French Profile Translations:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(translations.fr?.profile, null, 2)}
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
} 