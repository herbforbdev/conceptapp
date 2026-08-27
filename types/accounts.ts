import { Timestamp } from 'firebase/firestore';

export interface GlAccount {
  id: string;
  code: string;
  name: string;
  class: string;
  parentCode: string | null;
  isPostable: boolean;
  isActive: boolean;
  isDefaultSalesAccount: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface GlAccountSeed {
  code: string;
  name: string;
}

export interface AccountStamp {
  accountId: string;
  accountCode: string;
  accountName: string;
}

export type AccountRollup = 'leaf' | 'group' | 'class';

export interface AccountReportRow {
  id: string;
  code: string;
  name: string;
  class: string;
  salesUSD: number;
  salesCDF: number;
  costsUSD: number;
  costsCDF: number;
  netUSD: number;
  netCDF: number;
  isUnclassified: boolean;
}
