"use client";

import React, { useState, useEffect } from 'react';
import { Card, Button, TextInput, Label, Select, Alert } from 'flowbite-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getPrintSettings, savePrintSettings, DEFAULT_PRINT_CONFIG } from '@/services/firestore/printSettingsService';
import { HiDocumentText, HiSave, HiRefresh } from 'react-icons/hi';
import Link from 'next/link';
import { HiArrowNarrowLeft } from 'react-icons/hi';

const safeT = (t, key, fallback) => {
  try {
    const value = t(key);
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return String(fallback || key);
  } catch (error) {
    return String(fallback || key);
  }
};

// Custom Toggle Component that's always visible
const CustomToggle = ({ checked, onChange, label, id }) => {
  return (
    <label 
      htmlFor={id}
      className="relative inline-flex items-center cursor-pointer"
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#385e82]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#385e82]"></div>
    </label>
  );
};

export default function PrintSettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState(DEFAULT_PRINT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await getPrintSettings(user.uid);
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading print settings:', error);
      setMessage({ type: 'failure', text: safeT(t, 'settings.print.loadError', 'Failed to load print settings') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await savePrintSettings(user.uid, settings);
      setMessage({ type: 'success', text: safeT(t, 'settings.print.saved', 'Print settings saved successfully') });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving print settings:', error);
      setMessage({ type: 'failure', text: safeT(t, 'settings.print.saveError', 'Failed to save print settings') });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (path, value) => {
    setSettings(prev => {
      const keys = path.split('.');
      const newSettings = { ...prev };
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">{safeT(t, 'common.loading', 'Loading...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/settings" className="inline-flex items-center text-[#385e82] hover:text-[#031b31] mb-4">
            <HiArrowNarrowLeft className="mr-2 h-5 w-5" /> {safeT(t, 'settings.title', 'Settings')}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <HiDocumentText className="h-8 w-8 text-[#385e82]" />
            {safeT(t, 'settings.print.title', 'Print Settings')}
          </h1>
          <p className="text-gray-600 mt-2">
            {safeT(t, 'settings.print.description', 'Configure default print and PDF export settings for reports')}
          </p>
        </div>

        {message && (
          <Alert color={message.type} className="mb-6" onDismiss={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {/* Company Information */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-[#385e82] mb-4">
            {safeT(t, 'settings.print.companyInfo', 'Company Information')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">{safeT(t, 'settings.print.companyName', 'Company Name')}</Label>
              <TextInput
                id="companyName"
                value={settings.company.name}
                onChange={(e) => updateSettings('company.name', e.target.value)}
                placeholder={safeT(t, 'settings.print.companyNamePlaceholder', 'Enter company name')}
              />
            </div>
            <div>
              <Label htmlFor="companyAddress">{safeT(t, 'settings.print.address', 'Address')}</Label>
              <TextInput
                id="companyAddress"
                value={settings.company.address}
                onChange={(e) => updateSettings('company.address', e.target.value)}
                placeholder={safeT(t, 'settings.print.addressPlaceholder', 'Enter company address')}
              />
            </div>
            <div>
              <Label htmlFor="companyPhone">{safeT(t, 'settings.print.phone', 'Phone')}</Label>
              <TextInput
                id="companyPhone"
                value={settings.company.phone}
                onChange={(e) => updateSettings('company.phone', e.target.value)}
                placeholder={safeT(t, 'settings.print.phonePlaceholder', 'Enter phone number')}
              />
            </div>
            <div>
              <Label htmlFor="companyEmail">{safeT(t, 'settings.print.email', 'Email')}</Label>
              <TextInput
                id="companyEmail"
                type="email"
                value={settings.company.email}
                onChange={(e) => updateSettings('company.email', e.target.value)}
                placeholder={safeT(t, 'settings.print.emailPlaceholder', 'Enter email address')}
              />
            </div>
          </div>
        </Card>

        {/* Page Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-[#385e82] mb-4">
            {safeT(t, 'settings.print.pageSettings', 'Page Settings')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pageSize">{safeT(t, 'settings.print.pageSize', 'Page Size')}</Label>
              <Select
                id="pageSize"
                value={settings.page.size}
                onChange={(e) => updateSettings('page.size', e.target.value)}
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="orientation">{safeT(t, 'settings.print.orientation', 'Orientation')}</Label>
              <Select
                id="orientation"
                value={settings.page.orientation}
                onChange={(e) => updateSettings('page.orientation', e.target.value)}
              >
                <option value="portrait">{safeT(t, 'settings.print.portrait', 'Portrait')}</option>
                <option value="landscape">{safeT(t, 'settings.print.landscape', 'Landscape')}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="marginTop">{safeT(t, 'settings.print.marginTop', 'Top Margin')}</Label>
              <TextInput
                id="marginTop"
                value={settings.page.margin.top}
                onChange={(e) => updateSettings('page.margin.top', e.target.value)}
                placeholder="15mm"
              />
            </div>
            <div>
              <Label htmlFor="marginRight">{safeT(t, 'settings.print.marginRight', 'Right Margin')}</Label>
              <TextInput
                id="marginRight"
                value={settings.page.margin.right}
                onChange={(e) => updateSettings('page.margin.right', e.target.value)}
                placeholder="10mm"
              />
            </div>
            <div>
              <Label htmlFor="marginBottom">{safeT(t, 'settings.print.marginBottom', 'Bottom Margin')}</Label>
              <TextInput
                id="marginBottom"
                value={settings.page.margin.bottom}
                onChange={(e) => updateSettings('page.margin.bottom', e.target.value)}
                placeholder="15mm"
              />
            </div>
            <div>
              <Label htmlFor="marginLeft">{safeT(t, 'settings.print.marginLeft', 'Left Margin')}</Label>
              <TextInput
                id="marginLeft"
                value={settings.page.margin.left}
                onChange={(e) => updateSettings('page.margin.left', e.target.value)}
                placeholder="10mm"
              />
            </div>
          </div>
        </Card>

        {/* Header & Footer Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-[#385e82] mb-4">
            {safeT(t, 'settings.print.headerFooter', 'Header & Footer')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>{safeT(t, 'settings.print.enableHeader', 'Enable Header')}</Label>
                <p className="text-sm text-gray-600">{safeT(t, 'settings.print.enableHeaderDesc', 'Show header on printed pages')}</p>
              </div>
              <CustomToggle
                id="enableHeader"
                checked={settings.header.enabled}
                onChange={(checked) => updateSettings('header.enabled', checked)}
              />
            </div>
            {settings.header.enabled && (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>{safeT(t, 'settings.print.showCompanyName', 'Show Company Name')}</Label>
                  </div>
                  <CustomToggle
                    id="showCompanyName"
                    checked={settings.header.showCompanyName}
                    onChange={(checked) => updateSettings('header.showCompanyName', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>{safeT(t, 'settings.print.showReportTitle', 'Show Report Title')}</Label>
                  </div>
                  <CustomToggle
                    id="showReportTitle"
                    checked={settings.header.showReportTitle}
                    onChange={(checked) => updateSettings('header.showReportTitle', checked)}
                  />
                </div>
              </>
            )}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>{safeT(t, 'settings.print.enableFooter', 'Enable Footer')}</Label>
                <p className="text-sm text-gray-600">{safeT(t, 'settings.print.enableFooterDesc', 'Show footer on printed pages')}</p>
              </div>
              <CustomToggle
                id="enableFooter"
                checked={settings.footer.enabled}
                onChange={(checked) => updateSettings('footer.enabled', checked)}
              />
            </div>
            {settings.footer.enabled && (
              <>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>{safeT(t, 'settings.print.showPageNumbers', 'Show Page Numbers')}</Label>
                  </div>
                  <CustomToggle
                    id="showPageNumbers"
                    checked={settings.footer.showPageNumbers}
                    onChange={(checked) => updateSettings('footer.showPageNumbers', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>{safeT(t, 'settings.print.showGeneratedDate', 'Show Generated Date')}</Label>
                  </div>
                  <CustomToggle
                    id="showGeneratedDate"
                    checked={settings.footer.showGeneratedDate}
                    onChange={(checked) => updateSettings('footer.showGeneratedDate', checked)}
                  />
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Typography Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-[#385e82] mb-4">
            {safeT(t, 'settings.print.typography', 'Typography')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="bodyFontSize">{safeT(t, 'settings.print.bodyFontSize', 'Body Font Size')}</Label>
              <TextInput
                id="bodyFontSize"
                value={settings.typography.bodyFontSize}
                onChange={(e) => updateSettings('typography.bodyFontSize', e.target.value)}
                placeholder="11pt"
              />
            </div>
            <div>
              <Label htmlFor="tableFontSize">{safeT(t, 'settings.print.tableFontSize', 'Table Font Size')}</Label>
              <TextInput
                id="tableFontSize"
                value={settings.typography.tableFontSize}
                onChange={(e) => updateSettings('typography.tableFontSize', e.target.value)}
                placeholder="10pt"
              />
            </div>
            <div>
              <Label htmlFor="lineHeight">{safeT(t, 'settings.print.lineHeight', 'Line Height')}</Label>
              <TextInput
                id="lineHeight"
                value={settings.typography.lineHeight}
                onChange={(e) => updateSettings('typography.lineHeight', e.target.value)}
                placeholder="1.4"
              />
            </div>
          </div>
        </Card>

        {/* Table Settings */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-[#385e82] mb-4">
            {safeT(t, 'settings.print.tableSettings', 'Table Settings')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>{safeT(t, 'settings.print.repeatHeader', 'Repeat Table Headers')}</Label>
                <p className="text-sm text-gray-600">{safeT(t, 'settings.print.repeatHeaderDesc', 'Repeat headers on each page')}</p>
              </div>
              <CustomToggle
                id="repeatHeader"
                checked={settings.table.repeatHeader}
                onChange={(checked) => updateSettings('table.repeatHeader', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>{safeT(t, 'settings.print.avoidRowBreak', 'Avoid Row Breaks')}</Label>
                <p className="text-sm text-gray-600">{safeT(t, 'settings.print.avoidRowBreakDesc', 'Prevent rows from breaking across pages')}</p>
              </div>
              <CustomToggle
                id="avoidRowBreak"
                checked={settings.table.avoidRowBreak}
                onChange={(checked) => updateSettings('table.avoidRowBreak', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>{safeT(t, 'settings.print.preserveColors', 'Preserve Colors')}</Label>
                <p className="text-sm text-gray-600">{safeT(t, 'settings.print.preserveColorsDesc', 'Keep background colors in PDF')}</p>
              </div>
              <CustomToggle
                id="preserveColors"
                checked={settings.colors.preserveColors}
                onChange={(checked) => updateSettings('colors.preserveColors', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#385e82] hover:bg-[#031b31] text-white"
          >
            <HiSave className="h-5 w-5 mr-2" />
            {isSaving ? safeT(t, 'common.saving', 'Saving...') : safeT(t, 'common.save', 'Save Settings')}
          </Button>
          <Button
            onClick={loadSettings}
            color="gray"
            disabled={isSaving}
          >
            <HiRefresh className="h-5 w-5 mr-2" />
            {safeT(t, 'common.reset', 'Reset')}
          </Button>
        </div>
      </div>
    </div>
  );
}

