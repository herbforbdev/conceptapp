"use client";

import { Select } from "flowbite-react";
import { GlAccount } from "@/types/accounts";
import { formatAccountLabel, getPostableAccounts } from "@/lib/accounting/accountHelpers";

interface AccountSelectProps {
  value: string;
  onChange: (accountId: string) => void;
  accounts: GlAccount[];
  placeholder?: string;
  id?: string;
  className?: string;
  classFilter?: string;
}

const AccountSelect = ({
  value,
  onChange,
  accounts,
  placeholder = "",
  id,
  className = "w-full",
  classFilter
}: AccountSelectProps) => {
  const postable = getPostableAccounts(accounts).filter(account =>
    classFilter ? account.class === classFilter : true
  );

  const grouped = postable.reduce<Record<string, GlAccount[]>>((acc, account) => {
    const group = account.parentCode || account.class || "";
    if (!acc[group]) acc[group] = [];
    acc[group].push(account);
    return acc;
  }, {});

  return (
    <Select
      id={id}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{placeholder}</option>
      {Object.entries(grouped).map(([group, groupAccounts]) => (
        <optgroup key={group} label={group}>
          {groupAccounts.map(account => (
            <option key={account.id} value={account.id}>
              {formatAccountLabel(account)}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
};

export default AccountSelect;
