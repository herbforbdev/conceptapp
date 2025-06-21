export const TIME_PERIODS = {
  ALL: 'all',
  YEAR: 'year',
  MONTH: 'month',
  WEEK: 'week',
  TODAY: 'today',
  PREVIOUS_MONTH: 'previous_month',
  QUARTERLY: 'quarterly',
  CUSTOM: 'custom'
} as const;

export type TimePeriod = typeof TIME_PERIODS[keyof typeof TIME_PERIODS];

export const PERIODS = [
  TIME_PERIODS.ALL,
  TIME_PERIODS.YEAR,
  TIME_PERIODS.MONTH,
  TIME_PERIODS.WEEK,
  TIME_PERIODS.TODAY,
  TIME_PERIODS.PREVIOUS_MONTH,
  TIME_PERIODS.QUARTERLY,
  TIME_PERIODS.CUSTOM
] as const;

export function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case TIME_PERIODS.ALL:
      return 'All Time';
    case TIME_PERIODS.YEAR:
      return 'This Year';
    case TIME_PERIODS.MONTH:
      return 'This Month';
    case TIME_PERIODS.WEEK:
      return 'This Week';
    case TIME_PERIODS.TODAY:
      return 'Today';
    case TIME_PERIODS.PREVIOUS_MONTH:
      return 'Previous Month';
    case TIME_PERIODS.QUARTERLY:
      return 'Quarterly';
    case TIME_PERIODS.CUSTOM:
      return 'Custom Range';
    default:
      return period;
  }
} 