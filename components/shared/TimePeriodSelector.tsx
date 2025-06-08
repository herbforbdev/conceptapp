"use client";

import React, { useState } from 'react';
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

  const handlePeriodSelect = (period: TimePeriod) => {
    onPeriodChange(period);
    if (period !== TIME_PERIODS.CUSTOM) {
      setIsOpen(false);
    }
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (!onDateRangeChange) return;
    if (type === 'start') {
      onDateRangeChange(value, endDate || '');
    } else {
      onDateRangeChange(startDate || '', value);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-white border shadow-sm ${className}`}
      >
        <HiCalendar className="h-4 w-4" />
        <span>
          {selectedPeriod === TIME_PERIODS.CUSTOM
            ? t('timePeriods.custom')
            : t(`timePeriods.${selectedPeriod}`)}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-2">
            <Button
              color={selectedPeriod === TIME_PERIODS.ALL ? 'primary' : 'gray'}
              onClick={() => handlePeriodSelect(TIME_PERIODS.ALL)}
              className="w-full justify-start"
            >
              {t('timePeriods.all')}
            </Button>
            <Button
              color={selectedPeriod === TIME_PERIODS.YEAR ? 'primary' : 'gray'}
              onClick={() => handlePeriodSelect(TIME_PERIODS.YEAR)}
              className="w-full justify-start"
            >
              {t('timePeriods.thisYear')}
            </Button>
            <Button
              color={selectedPeriod === TIME_PERIODS.MONTH ? 'primary' : 'gray'}
              onClick={() => handlePeriodSelect(TIME_PERIODS.MONTH)}
              className="w-full justify-start"
            >
              {t('timePeriods.thisMonth')}
            </Button>
            <Button
              color={selectedPeriod === TIME_PERIODS.WEEK ? 'primary' : 'gray'}
              onClick={() => handlePeriodSelect(TIME_PERIODS.WEEK)}
              className="w-full justify-start"
            >
              {t('timePeriods.thisWeek')}
            </Button>
            <Button
              color={selectedPeriod === TIME_PERIODS.CUSTOM ? 'primary' : 'gray'}
              onClick={() => handlePeriodSelect(TIME_PERIODS.CUSTOM)}
              className="w-full justify-start"
            >
              {t('timePeriods.custom')}
            </Button>

            {selectedPeriod === TIME_PERIODS.CUSTOM && (
              <div className="space-y-2 mt-2 pt-2 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('filters.from')}
                  </label>
                  <input
                    type="date"
                    value={startDate || ''}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('filters.to')}
                  </label>
                  <input
                    type="date"
                    value={endDate || ''}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 