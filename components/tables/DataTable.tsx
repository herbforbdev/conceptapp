import React from 'react';
import { Table, TextInput, Select, Button } from 'flowbite-react';
import { useState, useMemo } from 'react';
import { HiChevronLeft, HiChevronRight, HiSearch } from 'react-icons/hi';

interface Column<T> {
  key: keyof T;
  label: string;
  type?: 'text' | 'number' | 'date';
  format?: (value: T[keyof T]) => string;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedItems?: string[];
  isDeleting?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export const DataTable = <T extends { id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onSelect,
  selectedItems = [],
  isDeleting = false,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange,
  className = ''
}: DataTableProps<T>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof T | ''>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter data based on search term
  const filteredData = useMemo(() => {
    return data.filter(item =>
      Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField as keyof T];
      const bValue = b[sortField as keyof T];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortField, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Handle sort
  const handleSort = (field: keyof T) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle row selection
  const toggleSelectAll = () => {
    if (selectedItems.length === data.length) {
      data.forEach(item => onSelect?.(item.id));
    } else {
      data.forEach(item => {
        if (!selectedItems.includes(item.id)) {
          onSelect?.(item.id);
        }
      });
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedItems.includes(id)) {
      onSelect?.(id);
    } else {
      onSelect?.(id);
    }
  };

  const formatValue = (value: T[keyof T], type?: string, format?: (value: T[keyof T]) => string): string => {
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
    <div className={className}>
      {/* Table Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <TextInput
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            icon={HiSearch}
          />
          <Select
            value={itemsPerPage}
            onChange={e => onPageChange?.(1)}
            className="w-24"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </Select>
        </div>
        {onSelect && selectedItems.length > 0 && (
          <Button
            color="failure"
            onClick={() => {
              data.forEach(item => onSelect(item.id));
            }}
          >
            Delete Selected
          </Button>
        )}
      </div>

      {/* Table */}
      <Table>
        <Table.Head>
          {onSelect && (
            <Table.HeadCell className="w-4 p-4">
              <input
                type="checkbox"
                checked={selectedItems.length === data.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
            </Table.HeadCell>
          )}
          {columns.map(column => (
            <Table.HeadCell
              key={String(column.key)}
              onClick={() => handleSort(column.key as keyof T)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-1">
                {column.label}
                {sortField === column.key && (
                  <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </div>
            </Table.HeadCell>
          ))}
          {(onEdit || onDelete) && (
            <Table.HeadCell>Actions</Table.HeadCell>
          )}
        </Table.Head>
        <Table.Body>
          {paginatedData.map((item, index) => (
            <Table.Row key={item.id || index}>
              {onSelect && (
                <Table.Cell className="w-4 p-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelectRow(item.id)}
                    className="rounded"
                  />
                </Table.Cell>
              )}
              {columns.map(column => (
                <Table.Cell key={String(column.key)}>
                  {formatValue(item[column.key], column.type, column.format)}
                </Table.Cell>
              ))}
              {(onEdit || onDelete) && (
                <Table.Cell>
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        size="sm"
                        color="info"
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        color="failure"
                        onClick={() => onDelete(item.id)}
                        disabled={isDeleting}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-700">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} entries
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange?.(currentPage - 1)}
          >
            <HiChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange?.(currentPage + 1)}
          >
            <HiChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}; 