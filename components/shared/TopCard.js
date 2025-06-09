import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function TopCard({ 
  title, 
  value, 
  subValue, 
  icon, 
  type = 'default', 
  trend,
  className = ''
}) {
  const { t: rawT } = useLanguage();
  
  // Safe t() to avoid rendering objects as React children
  const safeTitle = (titleValue) => {
    if (typeof titleValue === 'string') return titleValue;
    if (typeof titleValue === 'number') return titleValue.toString();
    if (typeof titleValue === 'object' && titleValue !== null) {
      // If it's an object, try to extract a string value
      if (titleValue.title) return titleValue.title;
      if (titleValue.label) return titleValue.label;
      if (titleValue.name) return titleValue.name;
      if (titleValue.value) return titleValue.value;
      // Fallback to empty string for objects
      return '';
    }
    return titleValue || '';
  };

  // Define styles based on type
  const typeStyles = {
    "Total Sales": { bg: "bg-blue-600", text: "text-blue-700", icon: "text-blue-500" },
    "Average Sale": { bg: "bg-green-600", text: "text-green-700", icon: "text-green-500" },
    "Best Selling": { bg: "bg-yellow-600", text: "text-yellow-700", icon: "text-yellow-500" },
    "Sales Growth": { bg: "bg-purple-600", text: "text-purple-700", icon: "text-purple-500" },
    "Total Inventory": { bg: "bg-blue-600", text: "text-blue-700", icon: "text-blue-500" },
    "Monthly Movement": { bg: "bg-green-600", text: "text-green-700", icon: "text-green-500" },
    "Stock Level": { bg: "bg-amber-600", text: "text-amber-700", icon: "text-amber-500" },
    "Total Costs": { bg: "bg-purple-600", text: "text-purple-700", icon: "text-purple-500" },
    "Daily Average": { bg: "bg-blue-600", text: "text-blue-700", icon: "text-blue-500" },
    "Top Expense": { bg: "bg-amber-600", text: "text-amber-700", icon: "text-amber-500" },
    "Growth": { bg: "bg-green-600", text: "text-green-700", icon: "text-green-500" },
    "default": { bg: "bg-gray-600", text: "text-gray-700", icon: "text-gray-500" }
  };

  const style = typeStyles[type] || typeStyles.default;

  // Get trend styles
  const getTrendStyles = () => {
    if (!trend) return {};
    return trend === 'up' 
      ? { text: 'text-green-600', bg: 'bg-green-100' }
      : { text: 'text-red-600', bg: 'bg-red-100' };
  };

  const trendStyles = getTrendStyles();

  return (
    <div className={`p-4 rounded-lg border ${style.bg === 'bg-gray-600' ? 'border-gray-200' : 'border-purple-200'} bg-white shadow-sm ${className}`}>
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">
            {safeTitle(title)}
          </p>
          <p className={`text-2xl font-bold ${style.text}`}>
            {value}
          </p>
          {subValue && (
            <p className={`text-sm ${trendStyles.text || 'text-gray-500'} ${trendStyles.bg || ''} inline-block px-2 py-0.5 rounded-full mt-1`}>
              {subValue}
            </p>
          )}
        </div>
        <div>
          {icon}
        </div>
      </div>
    </div>
  );
} 