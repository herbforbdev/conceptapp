import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function TableHeader({ 
  label, 
  sortKey, 
  currentSort, 
  onSort,
  align = 'left',
  className = ''
}) {
  const { t } = useLanguage();

  const handleClick = () => {
    if (onSort && sortKey) {
      onSort(sortKey);
    }
  };

  const getSortIndicator = () => {
    if (!sortKey || !currentSort || currentSort.key !== sortKey) return null;
    return currentSort.direction === 'asc' ? '↑' : '↓';
  };

  // Common table header translations
  const getTranslation = (key) => {
    const translations = {
      'date': 'common.date',
      'activity': 'common.activity',
      'product': 'common.product',
      'expense': 'common.expense',
      'channel': 'common.channel',
      'quantity': 'common.quantity',
      'amountFC': 'currency.amount_fc',
      'amountUSD': 'currency.amount_usd',
      'exchangeRate': 'currency.exchange_rate',
      'initialQuantity': 'inventory.initial_quantity',
      'quantityMoved': 'inventory.quantity_moved',
      'remainingQuantity': 'inventory.remaining_quantity',
      'movementType': 'inventory.movement_type',
      'actions': 'common.actions',
      'status': 'common.status',
      'type': 'common.type',
      'description': 'common.description',
      'budget': 'common.budget',
      'category': 'common.category',
      // Add more translations as needed
    };
    return translations[key] || key;
  };

  return (
    <th 
      className={`px-6 py-3 font-semibold ${
        align === 'center' ? 'text-center' : 
        align === 'right' ? 'text-right' : 
        'text-left'
      } ${
        onSort && sortKey ? 'cursor-pointer hover:bg-purple-800' : ''
      } ${className}`}
      onClick={handleClick}
    >
      <div className={`flex items-center ${
        align === 'center' ? 'justify-center' : 
        align === 'right' ? 'justify-end' : 
        'justify-start'
      }`}>
        {t(getTranslation(label))}
        {getSortIndicator() && (
          <span className="ml-2">{getSortIndicator()}</span>
        )}
      </div>
    </th>
  );
} 