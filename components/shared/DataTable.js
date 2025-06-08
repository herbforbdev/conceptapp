import React from 'react';
import { Card, Button } from 'flowbite-react';
import { HiTrash, HiPencil, HiRefresh, HiPlus } from 'react-icons/hi';

export default function DataTable({
  title,
  data,
  columns,
  selectedItems = [],
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onBulkDelete,
  onEdit,
  onRefresh,
  addNewHref,
  currentPage,
  entriesPerPage,
  onPageChange,
  totalPages,
  colorTheme = 'red',
  t, // Translation function
  sortConfig,
  onSort,
  renderCustomCell,
  showActions = true
}) {
  // Map color themes to Tailwind classes
  const themeClasses = {
    red: {
      header: 'text-red-900',
      headerBg: 'bg-red-50',
      headerBorder: 'border-red-200',
      gradient: 'from-red-50 to-red-100',
      button: {
        primary: 'bg-red-600 hover:bg-red-700',
        secondary: 'bg-red-100 text-red-600 hover:bg-red-200'
      },
      checkbox: 'text-red-600 border-red-300',
      row: 'hover:bg-red-50/50',
      pagination: {
        text: 'text-red-700',
        border: 'border-red-100',
        button: 'bg-red-100 text-red-600 hover:bg-red-200 disabled:bg-red-50 disabled:text-red-400'
      }
    },
    blue: {
      header: 'text-blue-900',
      headerBg: 'bg-blue-50',
      headerBorder: 'border-blue-200',
      gradient: 'from-blue-50 to-blue-100',
      button: {
        primary: 'bg-blue-600 hover:bg-blue-700',
        secondary: 'bg-blue-100 text-blue-600 hover:bg-blue-200'
      },
      checkbox: 'text-blue-600 border-blue-300',
      row: 'hover:bg-blue-50/50',
      pagination: {
        text: 'text-blue-700',
        border: 'border-blue-100',
        button: 'bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:bg-blue-50 disabled:text-blue-400'
      }
    },
    purple: {
      header: 'text-purple-900',
      headerBg: 'bg-purple-50',
      headerBorder: 'border-purple-200',
      gradient: 'from-purple-50 to-purple-100',
      button: {
        primary: 'bg-purple-600 hover:bg-purple-700',
        secondary: 'bg-purple-100 text-purple-600 hover:bg-purple-200'
      },
      checkbox: 'text-purple-600 border-purple-300',
      row: 'hover:bg-purple-50/50',
      pagination: {
        text: 'text-purple-700',
        border: 'border-purple-100',
        button: 'bg-purple-100 text-purple-600 hover:bg-purple-200 disabled:bg-purple-50 disabled:text-purple-400'
      }
    },
    green: {
      header: 'text-green-900',
      headerBg: 'bg-green-50',
      headerBorder: 'border-green-200',
      gradient: 'from-green-50 to-green-100',
      button: {
        primary: 'bg-green-600 hover:bg-green-700',
        secondary: 'bg-green-100 text-green-600 hover:bg-green-200'
      },
      checkbox: 'text-green-600 border-green-300',
      row: 'hover:bg-green-50/50',
      pagination: {
        text: 'text-green-700',
        border: 'border-green-100',
        button: 'bg-green-100 text-green-600 hover:bg-green-200 disabled:bg-green-50 disabled:text-green-400'
      }
    }
  };

  const theme = themeClasses[colorTheme];

  return (
    <Card className={`mb-6 bg-white border-2 ${theme.headerBorder}`}>
      <div className={`bg-gradient-to-r ${theme.gradient} border-b ${theme.headerBorder} rounded-t-2xl`}>
        <div className="p-6">
          <div className="flex justify-between items-center">
            <h5 className={`text-xl font-bold leading-none uppercase ${theme.header}`}>
              {title}
            </h5>
            <div className="flex space-x-2">
              {selectedItems.length > 0 && (
                <Button
                  color="failure"
                  size="sm"
                  onClick={onBulkDelete}
                  className={`${theme.button.primary} text-white font-medium px-3`}
                >
                  <HiTrash className="h-4 w-4 mr-2" />
                  {t('common.delete')} ({selectedItems.length})
                </Button>
              )}
              <Button
                color="gray"
                size="sm"
                onClick={onRefresh}
                className={`${theme.button.secondary} font-medium px-3`}
                title={t('common.refresh')}
              >
                <HiRefresh className="h-4 w-4" />
              </Button>
              {addNewHref && (
                <Button 
                  color="primary" 
                  size="sm" 
                  href={addNewHref}
                  className={`${theme.button.primary} text-white font-medium px-3`}
                  title={t('common.add')}
                >
                  <HiPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-900">
          <thead className={`${theme.headerBg} text-xs uppercase tracking-wider`}>
            <tr>
              <th className="p-4 w-4">
                <input
                  type="checkbox"
                  checked={selectedItems.length === data.length && data.length > 0}
                  onChange={onToggleSelectAll}
                  className={`h-4 w-4 rounded ${theme.checkbox}`}
                />
              </th>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={`px-6 py-4 font-semibold ${theme.header} cursor-pointer hover:bg-opacity-80`}
                  onClick={() => onSort && onSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {sortConfig?.key === column.key && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {showActions && (
                <th className={`px-6 py-4 font-semibold ${theme.header} text-center`}>
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (showActions ? 2 : 1)} className={`px-6 py-4 text-center ${theme.header}`}>
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className={`bg-white ${theme.row} transition-colors`}>
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => onToggleSelect(item.id)}
                      className={`h-4 w-4 rounded ${theme.checkbox}`}
                    />
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4">
                      {renderCustomCell ? 
                        renderCustomCell(item, column) : 
                        item[column.key]
                      }
                    </td>
                  ))}
                  {showActions && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          color="info"
                          size="xs"
                          onClick={() => onEdit(item)}
                          className={`h-8 w-8 p-0 flex items-center justify-center ${theme.button.secondary}`}
                          title={t('common.edit')}
                        >
                          <HiPencil className="h-4 w-4" />
                        </Button>
                        <Button
                          color="failure"
                          size="xs"
                          onClick={() => onDelete(item.id)}
                          className={`h-8 w-8 p-0 flex items-center justify-center ${theme.button.primary} text-white`}
                          title={t('common.delete')}
                        >
                          <HiTrash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data.length > entriesPerPage && (
          <div className={`flex justify-between items-center px-6 py-4 bg-white border-t ${theme.pagination.border}`}>
            <span className={`text-sm ${theme.pagination.text}`}>
              {t('common.showing')} {(currentPage - 1) * entriesPerPage + 1} {t('common.to')} {Math.min(currentPage * entriesPerPage, data.length)} {t('common.of')} {data.length} {t('common.entries')}
            </span>
            <div className="flex gap-2">
              <Button
                color="gray"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={theme.pagination.button}
              >
                {t('common.previous')}
              </Button>
              <Button
                color="gray"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={theme.pagination.button}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
} 