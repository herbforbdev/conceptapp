import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Select } from 'flowbite-react';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="en">English</option>
        <option value="fr">Français</option>
      </Select>
    </div>
  );
} 