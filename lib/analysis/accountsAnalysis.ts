import { AccountReportRow, AccountRollup, GlAccount } from '@/types/accounts';
import {
  UNCLASSIFIED_ACCOUNT_ID,
  createGlAccountMap,
  getRollupKey,
  stampFromExpenseType,
  getDefaultSalesAccount
} from '@/lib/accounting/accountHelpers';
import { parseFirestoreDate } from '@/lib/utils/dateUtils.ts';

interface AmountEntry {
  accountId?: string;
  accountCode?: string;
  accountName?: string;
  expenseTypeId?: string;
  amountUSD?: number;
  amountFC?: number;
  date?: unknown;
}

const isInRange = (dateValue: unknown, startDate: Date, endDate: Date): boolean => {
  const date = parseFirestoreDate(dateValue);
  if (!date) return false;
  const time = date.getTime();
  return time >= startDate.getTime() && time <= endDate.getTime();
};

const resolveStamp = (
  entry: AmountEntry,
  kind: 'cost' | 'sale',
  glAccountMap: Map<string, GlAccount>,
  expenseTypeMap: Map<string, { accountId?: string; accountCode?: string; accountName?: string }>,
  defaultSalesAccount?: GlAccount
) => {
  if (entry.accountId) {
    const stamped = glAccountMap.get(entry.accountId);
    return {
      accountId: entry.accountId,
      accountCode: stamped?.code || entry.accountCode || entry.accountId,
      accountName: stamped?.name || entry.accountName || ''
    };
  }

  if (kind === 'cost' && entry.expenseTypeId) {
    return stampFromExpenseType(expenseTypeMap.get(entry.expenseTypeId), glAccountMap);
  }

  if (kind === 'sale' && defaultSalesAccount) {
    return {
      accountId: defaultSalesAccount.id,
      accountCode: defaultSalesAccount.code,
      accountName: defaultSalesAccount.name
    };
  }

  return { accountId: '', accountCode: '', accountName: '' };
};

export const aggregateAccountsReport = (
  sales: AmountEntry[],
  costs: AmountEntry[],
  glAccounts: GlAccount[],
  expenseTypes: { id: string; accountId?: string; accountCode?: string; accountName?: string }[],
  startDate: Date,
  endDate: Date,
  rollup: AccountRollup
): AccountReportRow[] => {
  const glAccountMap = createGlAccountMap(glAccounts);
  const expenseTypeMap = new Map(expenseTypes.map(type => [type.id, type]));
  const defaultSalesAccount = getDefaultSalesAccount(glAccounts);
  const rows = new Map<string, AccountReportRow>();

  const getOrCreateRow = (code: string, name: string, accountClass: string, isUnclassified: boolean): AccountReportRow => {
    const id = isUnclassified ? UNCLASSIFIED_ACCOUNT_ID : code;
    const existing = rows.get(id);
    if (existing) return existing;
    const created: AccountReportRow = {
      id,
      code: isUnclassified ? '' : code,
      name,
      class: accountClass,
      salesUSD: 0,
      salesCDF: 0,
      costsUSD: 0,
      costsCDF: 0,
      netUSD: 0,
      netCDF: 0,
      isUnclassified
    };
    rows.set(id, created);
    return created;
  };

  const applyEntry = (entry: AmountEntry, kind: 'cost' | 'sale') => {
    if (!isInRange(entry.date, startDate, endDate)) return;
    const stamp = resolveStamp(entry, kind, glAccountMap, expenseTypeMap, defaultSalesAccount);
    const unclassified = !stamp.accountCode;
    const key = unclassified ? UNCLASSIFIED_ACCOUNT_ID : getRollupKey(stamp.accountCode, rollup);
    const rolledAccount = unclassified ? undefined : glAccountMap.get(key);
    const row = getOrCreateRow(
      unclassified ? '' : key,
      unclassified ? '' : (rolledAccount?.name || stamp.accountName || key),
      unclassified ? '' : (rolledAccount?.class || key[0] || ''),
      unclassified
    );

    const usd = Number(entry.amountUSD) || 0;
    const cdf = Number(entry.amountFC) || 0;
    if (kind === 'sale') {
      row.salesUSD += usd;
      row.salesCDF += cdf;
    } else {
      row.costsUSD += usd;
      row.costsCDF += cdf;
    }
  };

  sales.forEach(entry => applyEntry(entry, 'sale'));
  costs.forEach(entry => applyEntry(entry, 'cost'));

  return Array.from(rows.values())
    .map(row => ({
      ...row,
      netUSD: row.salesUSD - row.costsUSD,
      netCDF: row.salesCDF - row.costsCDF
    }))
    .sort((a, b) => {
      if (a.isUnclassified) return 1;
      if (b.isUnclassified) return -1;
      return String(a.code || '').localeCompare(String(b.code || ''), 'fr', { numeric: true });
    });
};

export const summarizeAccountRows = (rows: AccountReportRow[]) => {
  return rows.reduce(
    (acc, row) => {
      acc.salesUSD += row.salesUSD;
      acc.salesCDF += row.salesCDF;
      acc.costsUSD += row.costsUSD;
      acc.costsCDF += row.costsCDF;
      acc.netUSD += row.netUSD;
      acc.netCDF += row.netCDF;
      return acc;
    },
    { salesUSD: 0, salesCDF: 0, costsUSD: 0, costsCDF: 0, netUSD: 0, netCDF: 0 }
  );
};
