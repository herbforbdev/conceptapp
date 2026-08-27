"use client";

import { useMemo, useState } from "react";
import { Button, TextInput } from "flowbite-react";
import { HiCheck, HiPencil, HiPlus, HiTrash, HiX } from "react-icons/hi";
import { useLanguage } from "@/context/LanguageContext";
import { GlAccount } from "@/types/accounts";
import { sortAccountsByCode } from "@/lib/accounting/accountHelpers";
import {
  addGlAccount,
  clearDefaultSalesAccount,
  deleteGlAccount,
  seedClass6AccountsIfEmpty,
  setDefaultSalesAccount,
  updateGlAccount
} from "@/services/firestore/glAccountsService";

interface GlAccountsTabProps {
  glAccounts: GlAccount[];
  loading: boolean;
}

const GlAccountsTab = ({ glAccounts, loading }: GlAccountsTabProps) => {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const sortedAccounts = useMemo(() => sortAccountsByCode(glAccounts || []), [glAccounts]);

  const handleSeed = async () => {
    setError("");
    setIsSeeding(true);
    try {
      await seedClass6AccountsIfEmpty();
    } catch (err) {
      console.error(err);
      setError(t("masterData.accounts.seedError"));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAdd = async () => {
    setError("");
    if (!code.trim() || !name.trim()) {
      setError(t("masterData.validation.required"));
      return;
    }
    setIsSaving(true);
    try {
      await addGlAccount(code, name);
      setCode("");
      setName("");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error && err.message.includes("already exists")
        ? t("masterData.accounts.duplicateCode")
        : t("masterData.accounts.saveError");
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) {
      setError(t("masterData.validation.required"));
      return;
    }
    try {
      await updateGlAccount(id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      console.error(err);
      setError(t("masterData.accounts.saveError"));
    }
  };

  const handleDelete = async (account: GlAccount) => {
    if (!window.confirm(t("masterData.modal.deleteMessage"))) return;
    try {
      await deleteGlAccount(account.id);
    } catch (err) {
      console.error(err);
      setError(t("masterData.accounts.deleteError"));
    }
  };

  const handleToggleDefaultSales = async (account: GlAccount) => {
    try {
      if (account.isDefaultSalesAccount) {
        await clearDefaultSalesAccount(account.id);
        return;
      }
      await setDefaultSalesAccount(account.id);
    } catch (err) {
      console.error(err);
      setError(t("masterData.accounts.defaultSalesError"));
    }
  };

  if (loading) {
    return <p className="p-6 text-gray-600">{t("masterData.loading")}</p>;
  }

  return (
    <div className="p-4">
      {sortedAccounts.length === 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">{t("masterData.accounts.empty")}</p>
          <Button
            size="sm"
            onClick={handleSeed}
            disabled={isSeeding}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSeeding ? t("common.loading") : t("masterData.accounts.loadChart")}
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="md:w-40">
          <label htmlFor="gl-account-code" className="mb-1 block text-sm text-gray-600">
            {t("masterData.accounts.code")}
          </label>
          <TextInput
            id="gl-account-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="701"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="gl-account-name" className="mb-1 block text-sm text-gray-600">
            {t("masterData.accounts.name")}
          </label>
          <TextInput
            id="gl-account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("masterData.accounts.namePlaceholder")}
          />
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <HiPlus className="mr-1 h-4 w-4" />
          {t("common.add")}
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("masterData.accounts.code")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("masterData.accounts.name")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("masterData.accounts.level")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("masterData.accounts.defaultSales")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("masterData.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedAccounts.map(account => {
              const indent = Math.max(0, account.code.length - 1) * 16;
              const isHeader = !account.isPostable;
              return (
                <tr key={account.id}>
                  <td className="px-6 py-3 font-medium text-gray-900" style={{ paddingLeft: `${24 + indent}px` }}>
                    {account.code}
                  </td>
                  <td className={`px-6 py-3 ${isHeader ? "font-medium text-gray-800" : "text-gray-600"}`}>
                    {editingId === account.id ? (
                      <TextInput
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full"
                        aria-label={t("masterData.accounts.name")}
                      />
                    ) : (
                      account.name
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {isHeader ? t("masterData.accounts.header") : t("masterData.accounts.postable")}
                  </td>
                  <td className="px-6 py-3">
                    {account.class === "7" && account.isPostable ? (
                      <input
                        type="checkbox"
                        checked={Boolean(account.isDefaultSalesAccount)}
                        onChange={() => handleToggleDefaultSales(account)}
                        aria-label={t("masterData.accounts.defaultSales")}
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === account.id ? (
                        <>
                          <Button
                            color="success"
                            size="xs"
                            onClick={() => handleSaveEdit(account.id)}
                            className="bg-green-100 text-green-600 hover:bg-green-200"
                          >
                            <HiCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            color="gray"
                            size="xs"
                            onClick={() => { setEditingId(null); setEditingName(""); }}
                            className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                          >
                            <HiX className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            color="light"
                            size="xs"
                            onClick={() => { setEditingId(account.id); setEditingName(account.name); }}
                            className="rounded-lg bg-blue-50 text-blue-600 shadow-sm transition-all duration-200 hover:bg-blue-100"
                          >
                            <HiPencil className="h-4 w-4" />
                          </Button>
                          {account.isPostable && (
                            <Button
                              color="failure"
                              size="xs"
                              onClick={() => handleDelete(account)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              <HiTrash className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlAccountsTab;
