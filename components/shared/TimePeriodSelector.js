"use client";

import React from 'react';
import { Select } from 'flowbite-react';
import { TIME_PERIODS } from '@/lib/constants/timePeriods';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Simplified Time Period Selector Component
 * @param {Object} props - Component props
 * @param {string} props.selectedTimePeriod - The currently selected period
 * @param {Function} props.onChange - Function to call when period changes
 * @returns {JSX.Element} TimePeriodSelector component
 */
export default function TimePeriodSelector({
  selectedTimePeriod,
  onChange
}) {
  const { t } = useLanguage();

  // Translation mapping for time periods
  const getPeriodLabel = (period) => {
    switch (period) {
      case TIME_PERIODS.ALL:
        return t('timePeriods.all');
      case TIME_PERIODS.YEAR:
        return t('timePeriods.thisYear');
      case TIME_PERIODS.MONTH:
        return t('timePeriods.thisMonth');
      case TIME_PERIODS.WEEK:
        return t('timePeriods.thisWeek');
      case TIME_PERIODS.CUSTOM:
        return t('timePeriods.custom');
      default:
        return period;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedTimePeriod || TIME_PERIODS.MONTH}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm font-medium text-gray-800"
      >
        {Object.values(TIME_PERIODS).map((period) => (
          <option key={period} value={period}>
            {getPeriodLabel(period)}
          </option>
        ))}
      </Select>
    </div>
  );
} 