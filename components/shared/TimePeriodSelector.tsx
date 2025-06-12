"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'flowbite-react';
import { HiCalendar } from 'react-icons/hi';
import { useLanguage } from '@/context/LanguageContext';
import { TIME_PERIODS, TimePeriod } from '@/lib/constants/timePeriods';

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  className?: string;
}

export default function TimePeriodSelector({
  selectedPeriod,
  onPeriodChange,
  startDate,
  endDate,
  onDateRangeChange,
  className = ''
}: TimePeriodSelectorProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure proper hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handlePeriodSelect = (period: TimePeriod) => {
    try {
    onPeriodChange(period);
    if (period !== TIME_PERIODS.CUSTOM) {
      setIsOpen(false);
      }
    } catch (error) {
      console.error('Error selecting period:', error);
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    try {
    if (!onDateRangeChange) return;
    if (type === 'start') {
      onDateRangeChange(value, endDate || '');
    } else {
      onDateRangeChange(startDate || '', value);
    }
    } catch (error) {
      console.error('Error changing date:', error);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <Button className={`flex items-center gap-2 bg-white border shadow-sm ${className}`}>
        <HiCalendar className="h-4 w-4" />
        <span>Loading...</span>
      </Button>
    );
  }

  const getSelectedLabel = () => {
    if (selectedPeriod === TIME_PERIODS.CUSTOM) {
      return String(t('timePeriods.custom') || 'Custom');
    }
    return String(t(`timePeriods.${selectedPeriod}`) || selectedPeriod);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={toggleDropdown}
        className={`flex items-center gap-2 bg-white border shadow-sm hover:bg-gray-50 ${className}`}
        type="button"
      >
        <HiCalendar className="h-4 w-4" />
        <span>{getSelectedLabel()}</span>
      </Button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-[9999]"
          style={{ zIndex: 9999 }}
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handlePeriodSelect(TIME_PERIODS.ALL)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                selectedPeriod === TIME_PERIODS.ALL 
                  ? 'bg-blue-100 text-blue-900 font-medium' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {String(t('timePeriods.all') || 'All Time')}
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect(TIME_PERIODS.YEAR)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                selectedPeriod === TIME_PERIODS.YEAR 
                  ? 'bg-blue-100 text-blue-900 font-medium' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {String(t('timePeriods.thisYear') || 'This Year')}
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect(TIME_PERIODS.MONTH)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                selectedPeriod === TIME_PERIODS.MONTH 
                  ? 'bg-blue-100 text-blue-900 font-medium' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {String(t('timePeriods.thisMonth') || 'This Month')}
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect(TIME_PERIODS.WEEK)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                selectedPeriod === TIME_PERIODS.WEEK 
                  ? 'bg-blue-100 text-blue-900 font-medium' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {String(t('timePeriods.thisWeek') || 'This Week')}
            </button>
            <button
              type="button"
              onClick={() => handlePeriodSelect(TIME_PERIODS.CUSTOM)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                selectedPeriod === TIME_PERIODS.CUSTOM 
                  ? 'bg-blue-100 text-blue-900 font-medium' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {String(t('timePeriods.custom') || 'Custom')}
            </button>

            {selectedPeriod === TIME_PERIODS.CUSTOM && (
              <div className="space-y-2 mt-2 pt-2 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {String(t('filters.fromMonth') || 'From Month')}
                  </label>
                  <select
                    value={startDate || ''}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 bg-white px-3 py-2"
                  >
                    <option value="">{String(t('filters.selectMonth') || 'Select month')}</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2023, i, 1).toLocaleString('default', { month: 'long' });
                      return (
                        <option key={month} value={String(month)}>
                          {monthName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {String(t('filters.toMonth') || 'To Month')}
                  </label>
                  <select
                    value={endDate || ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-primary-500 text-gray-900 bg-white px-3 py-2"
                  >
                    <option value="">{String(t('filters.selectMonth') || 'Select month')}</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2023, i, 1).toLocaleString('default', { month: 'long' });
                      return (
                        <option key={month} value={String(month)}>
                          {monthName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 