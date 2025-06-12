"use client";

import React from 'react';
import { Select } from 'flowbite-react';
import { TIME_PERIODS } from '@/lib/constants/timePeriods';

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
  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedTimePeriod || TIME_PERIODS.MONTH}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm"
      >
        {Object.values(TIME_PERIODS).map((period) => (
          <option key={period} value={period}>
            {String(period)}
          </option>
        ))}
      </Select>
    </div>
  );
} 