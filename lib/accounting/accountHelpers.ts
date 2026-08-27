import { AccountRollup, AccountStamp, GlAccount, GlAccountSeed } from '@/types/accounts';

export const UNCLASSIFIED_ACCOUNT_ID = '__unclassified__';

export const getParentCode = (code: string): string | null => {
  if (!code || code.length <= 1) return null;
  return code.slice(0, -1);
};

export const getAccountClass = (code: string): string => {
  return code?.[0] || '';
};

export const formatAccountLabel = (account: Pick<GlAccount, 'code' | 'name'> | null | undefined): string => {
  if (!account?.code) return '';
  return `${account.code} — ${account.name}`;
};

export const buildGlAccountRecords = (seeds: GlAccountSeed[]): Omit<GlAccount, 'id' | 'createdAt' | 'updatedAt'>[] => {
  const codes = new Set(seeds.map(seed => seed.code));
  const parentsWithChildren = new Set<string>();

  seeds.forEach(seed => {
    const parentCode = getParentCode(seed.code);
    if (parentCode && codes.has(parentCode)) {
      parentsWithChildren.add(parentCode);
    }
  });

  return seeds.map(seed => ({
    code: seed.code,
    name: seed.name,
    class: getAccountClass(seed.code),
    parentCode: getParentCode(seed.code),
    isPostable: !parentsWithChildren.has(seed.code),
    isActive: true,
    isDefaultSalesAccount: false
  }));
};

export const createGlAccountMap = (accounts: GlAccount[]): Map<string, GlAccount> => {
  const map = new Map<string, GlAccount>();
  accounts.forEach(account => {
    if (account.id) map.set(account.id, account);
    if (account.code) map.set(account.code, account);
  });
  return map;
};

export const getPostableAccounts = (accounts: GlAccount[]): GlAccount[] => {
  return accounts
    .filter(account => account.isPostable && account.isActive !== false)
    .sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }));
};

export const getDefaultSalesAccount = (accounts: GlAccount[]): GlAccount | undefined => {
  return accounts.find(account =>
    account.isDefaultSalesAccount &&
    account.isActive !== false &&
    account.class === '7' &&
    account.isPostable
  );
};

export const emptyAccountStamp = (): AccountStamp => ({
  accountId: '',
  accountCode: '',
  accountName: ''
});

export const buildAccountStamp = (account: GlAccount | null | undefined): AccountStamp => {
  if (!account?.id && !account?.code) return emptyAccountStamp();
  return {
    accountId: account.id || account.code,
    accountCode: account.code || '',
    accountName: account.name || ''
  };
};

export const stampFromExpenseType = (
  expenseType: { accountId?: string; accountCode?: string; accountName?: string } | null | undefined,
  glAccountMap: Map<string, GlAccount>
): AccountStamp => {
  if (!expenseType?.accountId) return emptyAccountStamp();
  const account = glAccountMap.get(expenseType.accountId);
  if (account) return buildAccountStamp(account);
  if (expenseType.accountCode) {
    return {
      accountId: expenseType.accountId,
      accountCode: expenseType.accountCode,
      accountName: expenseType.accountName || ''
    };
  }
  return emptyAccountStamp();
};

export const getRollupKey = (code: string, rollup: AccountRollup): string => {
  if (!code) return UNCLASSIFIED_ACCOUNT_ID;
  if (rollup === 'class') return code[0];
  if (rollup === 'group') return code.slice(0, Math.min(2, code.length));
  return code;
};

export const sortAccountsByCode = (accounts: GlAccount[]): GlAccount[] => {
  return [...accounts].sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }));
};
