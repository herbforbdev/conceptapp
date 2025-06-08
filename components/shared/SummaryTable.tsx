import React from 'react';
import { Table } from 'flowbite-react';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  format?: (value: unknown) => string;
}

interface TableActions<T> {
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
}

interface SummaryTableProps<T extends { id: string }> {
  data: T[];
  columns: Column[];
  actions?: TableActions<T>;
  selectedItems?: string[];
  isDeleting?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}

function SummaryTable<T extends { id: string }>({
  data,
  columns,
  actions,
  selectedItems = [],
  isDeleting = false,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange
}: SummaryTableProps<T>) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedData = data.slice(startIndex, endIndex);

  const formatValue = (value: unknown, type?: string, format?: (value: unknown) => string): string => {
    if (format) {
      return format(value);
    }

    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      case 'date':
        return value instanceof Date ? value.toLocaleDateString() : String(value);
      default:
        return String(value);
    }
  };

  return (
    <Table>
      <Table.Head>
        <Table.HeadCell>
          <input
            type="checkbox"
            checked={selectedItems.length === data.length}
            onChange={() => {
              if (actions?.onSelect) {
                if (selectedItems.length === data.length) {
                  data.forEach(item => actions.onSelect?.(item.id));
                } else {
                  data.forEach(item => {
                    if (!selectedItems.includes(item.id)) {
                      actions.onSelect?.(item.id);
                    }
                  });
                }
              }
            }}
          />
        </Table.HeadCell>
        {columns.map(column => (
          <Table.HeadCell key={column.key}>{column.label}</Table.HeadCell>
        ))}
        {(actions?.onEdit || actions?.onDelete) && (
          <Table.HeadCell>Actions</Table.HeadCell>
        )}
      </Table.Head>
      <Table.Body>
        {displayedData.map(item => (
          <Table.Row key={item.id}>
            <Table.Cell>
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => actions?.onSelect?.(item.id)}
              />
            </Table.Cell>
            {columns.map(column => (
              <Table.Cell key={column.key}>
                {formatValue(item[column.key as keyof T], column.type, column.format)}
              </Table.Cell>
            ))}
            {(actions?.onEdit || actions?.onDelete) && (
              <Table.Cell>
                <div className="flex gap-2">
                  {actions.onEdit && (
                    <button
                      onClick={() => actions.onEdit?.(item)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                  )}
                  {actions.onDelete && (
                    <button
                      onClick={() => actions.onDelete?.(item.id)}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </Table.Cell>
            )}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

export default SummaryTable; 