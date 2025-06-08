import { TIME_PERIODS } from '@/lib/constants/timePeriods';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getDefaultDateRange(period: string): DateRange {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case TIME_PERIODS.YEAR:
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.MONTH:
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(now.getMonth() + 1, 0); // Last day of current month
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.WEEK:
      const dayOfWeek = now.getDay();
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.TODAY:
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.PREVIOUS_MONTH:
      startDate.setMonth(now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0); // Last day of previous month
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.QUARTERLY:
      startDate.setMonth(now.getMonth() - 2, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.CUSTOM:
      // For custom range, return current month by default
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case TIME_PERIODS.ALL:
    default:
      // Default to last 12 months
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
}

export function formatDate(date: Date | string): string {
  const currentDate = new Date(date);
  return currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate && 
         !isNaN(startDate.getTime()) && 
         !isNaN(endDate.getTime());
} 