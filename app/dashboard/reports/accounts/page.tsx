"use client";

import { useMemo, useState } from "react";
import { Card, Select } from "flowbite-react";
import Link from "next/link";
import { HiArrowNarrowLeft, HiCurrencyDollar, HiTrendingDown, HiTrendingUp } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { useMasterData } from "@/hooks/useMasterData";
import AdminOnly from "@/components/AdminOnly";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import TopCard from "@/components/shared/TopCard";
import { formatDateForInput } from "@/lib/utils/dateUtils.ts";
import { AccountRollup, AccountReportRow, GlAccount } from "@/types/accounts";
import { aggregateAccountsReport, summarizeAccountRows } from "@/lib/analysis/accountsAnalysis";

const formatMoney = (value: number, currency: "USD" | "CDF") => {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "USD" ? 2 : 0
  });
};

const getMonthRange = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

export default function AccountsReportPage() {
  const { t } = useLanguage();
  const monthRange = getMonthRange();
  const [startDate, setStartDate] = useState(formatDateForInput(monthRange.startDate));
  const [endDate, setEndDate] = useState(formatDateForInput(monthRange.endDate));
  const [rollup, setRollup] = useState<AccountRollup>("leaf");

  const { data: sales, loading: salesLoading, error: salesError } = useFirestoreCollection("Sales");
  const { data: costs, loading: costsLoading, error: costsError } = useFirestoreCollection("Costs");
  const { data: glAccounts, loading: accountsLoading, error: accountsError } = useFirestoreCollection<GlAccount>("GlAccounts");
  const { expenseTypes, loading: masterLoading } = useMasterData();

  const loading = salesLoading || costsLoading || accountsLoading || masterLoading;
  const error = salesError || costsError || accountsError;

  const rows = useMemo(() => {
    if (!sales || !costs || !glAccounts) return [];
    const rangeStart = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T23:59:59.999`);
    return aggregateAccountsReport(
      sales,
      costs,
      glAccounts,
      expenseTypes || [],
      rangeStart,
      rangeEnd,
      rollup
    );
  }, [sales, costs, glAccounts, expenseTypes, startDate, endDate, rollup]);

  const summary = useMemo(() => summarizeAccountRows(rows), [rows]);

  const unclassifiedLabel = t("reports.accounts.unclassified");

  const getRowName = (row: AccountReportRow) => (
    row.isUnclassified ? unclassifiedLabel : (row.name || row.code)
  );

  return (
    <AdminOnly>
      <div className="p-2 md:p-4">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-blue-600 hover:text-blue-800">
            <HiArrowNarrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{t("reports.accounts.title")}</h1>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="accounts-start-date" className="mb-1 block text-sm text-gray-600">
              {t("reports.accounts.startDate")}
            </label>
            <input
              id="accounts-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="accounts-end-date" className="mb-1 block text-sm text-gray-600">
              {t("reports.accounts.endDate")}
            </label>
            <input
              id="accounts-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="accounts-rollup" className="mb-1 block text-sm text-gray-600">
              {t("reports.accounts.rollup")}
            </label>
            <Select
              id="accounts-rollup"
              value={rollup}
              onChange={(e) => setRollup(e.target.value as AccountRollup)}
            >
              <option value="leaf">{t("reports.accounts.rollupLeaf")}</option>
              <option value="group">{t("reports.accounts.rollupGroup")}</option>
              <option value="class">{t("reports.accounts.rollupClass")}</option>
            </Select>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {!loading && error && (
          <p className="text-red-600">{t("common.error")}</p>
        )}

        {!loading && !error && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <TopCard
                title={t("reports.accounts.totalSales")}
                value={formatMoney(summary.salesUSD, "USD")}
                subValue={formatMoney(summary.salesCDF, "CDF")}
                icon={<HiTrendingUp size={16} />}
                type="Total Sales"
              />
              <TopCard
                title={t("reports.accounts.totalCosts")}
                value={formatMoney(summary.costsUSD, "USD")}
                subValue={formatMoney(summary.costsCDF, "CDF")}
                icon={<HiTrendingDown size={16} />}
                type="Total Costs"
              />
              <TopCard
                title={t("reports.accounts.net")}
                value={formatMoney(summary.netUSD, "USD")}
                subValue={formatMoney(summary.netCDF, "CDF")}
                icon={<HiCurrencyDollar size={16} />}
                type="Sales Growth"
              />
            </div>

            <Card>
              {rows.length === 0 ? (
                <p className="p-4 text-gray-600">{t("reports.accounts.empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          {t("reports.accounts.code")}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          {t("reports.accounts.name")}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          {t("reports.accounts.salesUsd")}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          {t("reports.accounts.salesCdf")}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          {t("reports.accounts.costsUsd")}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          {t("reports.accounts.costsCdf")}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          {t("reports.accounts.netUsd")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {rows.map(row => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {row.isUnclassified ? "—" : row.code}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{getRowName(row)}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(row.salesUSD, "USD")}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(row.salesCDF, "CDF")}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(row.costsUSD, "USD")}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(row.costsCDF, "CDF")}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatMoney(row.netUSD, "USD")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AdminOnly>
  );
}
