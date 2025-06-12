import React, { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { HiInbox, HiTrendingUp, HiTrendingDown, HiShoppingCart } from 'react-icons/hi';

export default function TopCard({ 
  title, 
  value, 
  subValue, 
  icon, 
  type = 'default', 
  trend,
  className = '',
  titleClassName = '',
  valueClassName = '',
  subValueClassName = '',
  iconWrapperClassName = ''
}) {
  const { t: rawT } = useLanguage?.() || { t: (x) => x };
  
  // Safe t() to avoid rendering objects as React children
  const safeT = (key) => {
    try {
      const value = rawT?.(key);
      if (typeof value === 'string' || typeof value === 'number') return String(value);
      if (value === undefined || value === null) return '';
      return String(value);
    } catch (error) {
      return '';
    }
  };
  
  // Ensure title is always a string
  const safeTitle = useMemo(() => {
    if (typeof title === 'string') return title;
    if (typeof title === 'number') return String(title);
    if (title === null || title === undefined) return '';
    if (typeof title === 'object') {
      // If it's an object, try to extract a string value
      if (title.title) return String(title.title);
      if (title.label) return String(title.label);
      if (title.name) return String(title.name);
      if (title.value) return String(title.value);
      return '';
    }
    return String(title || '');
  }, [title]);

  // Ensure value is always a string
  const safeValue = useMemo(() => {
    if (value === null || value === undefined) return '';
    return String(value);
  }, [value]);

  // Ensure subValue is always a string
  const safeSubValue = useMemo(() => {
    if (subValue === null || subValue === undefined) return '';
    return String(subValue);
  }, [subValue]);

  // Define modern styles based on type with proper colors and backgrounds
  const typeStyles = useMemo(() => ({
    "Total Sales": { 
      iconBg: "bg-blue-500", 
      iconColor: "text-white", 
      textColor: "text-blue-700",
      borderColor: "border-blue-100",
      iconType: "inbox" 
    },
    "Average Sale": { 
      iconBg: "bg-green-500", 
      iconColor: "text-white", 
      textColor: "text-green-700",
      borderColor: "border-green-100",
      iconType: "trending-up" 
    },
    "Best Selling": { 
      iconBg: "bg-yellow-500", 
      iconColor: "text-white", 
      textColor: "text-yellow-700",
      borderColor: "border-yellow-100",
      iconType: "shopping-cart" 
    },
    "Sales Growth": { 
      iconBg: "bg-purple-500", 
      iconColor: "text-white", 
      textColor: "text-purple-700",
      borderColor: "border-purple-100",
      iconType: "trending-up" 
    },
    "Total Inventory": { 
      iconBg: "bg-indigo-500", 
      iconColor: "text-white", 
      textColor: "text-indigo-700",
      borderColor: "border-indigo-100",
      iconType: "inbox" 
    },
    "Monthly Movement": { 
      iconBg: "bg-teal-500", 
      iconColor: "text-white", 
      textColor: "text-teal-700",
      borderColor: "border-teal-100",
      iconType: "trending-up" 
    },
    "Stock Level": { 
      iconBg: "bg-amber-500", 
      iconColor: "text-white", 
      textColor: "text-amber-700",
      borderColor: "border-amber-100",
      iconType: "inbox" 
    },
    "Total Costs": { 
      iconBg: "bg-red-500", 
      iconColor: "text-white", 
      textColor: "text-red-700",
      borderColor: "border-red-100",
      iconType: "inbox" 
    },
    "Daily Average": { 
      iconBg: "bg-blue-500", 
      iconColor: "text-white", 
      textColor: "text-blue-700",
      borderColor: "border-blue-100",
      iconType: "trending-up" 
    },
    "Top Expense": { 
      iconBg: "bg-orange-500", 
      iconColor: "text-white", 
      textColor: "text-orange-700",
      borderColor: "border-orange-100",
      iconType: "shopping-cart" 
    },
    "Growth": { 
      iconBg: "bg-emerald-500", 
      iconColor: "text-white", 
      textColor: "text-emerald-700",
      borderColor: "border-emerald-100",
      iconType: "trending-up" 
    },
    "totalCosts": { 
      iconBg: "bg-red-500", 
      iconColor: "text-white", 
      textColor: "text-red-700",
      borderColor: "border-red-100",
      iconType: "inbox" 
    },
    "dailyAverage": { 
      iconBg: "bg-blue-500", 
      iconColor: "text-white", 
      textColor: "text-blue-700",
      borderColor: "border-blue-100",
      iconType: "trending-up" 
    },
    "topExpense": { 
      iconBg: "bg-orange-500", 
      iconColor: "text-white", 
      textColor: "text-orange-700",
      borderColor: "border-orange-100",
      iconType: "shopping-cart" 
    },
    "growth": { 
      iconBg: "bg-emerald-500", 
      iconColor: "text-white", 
      textColor: "text-emerald-700",
      borderColor: "border-emerald-100",
      iconType: "trending-up" 
    },
    "default": { 
      iconBg: "bg-gray-500", 
      iconColor: "text-white", 
      textColor: "text-gray-700",
      borderColor: "border-gray-100",
      iconType: "inbox" 
    }
  }), []);

  // Safely access style object with fallback to default
  const style = useMemo(() => {
    const styleObj = typeStyles[type] || typeStyles.default;
    return {
      iconBg: styleObj?.iconBg || "bg-gray-500",
      iconColor: styleObj?.iconColor || "text-white",
      textColor: styleObj?.textColor || "text-gray-700",
      borderColor: styleObj?.borderColor || "border-gray-100",
      iconType: styleObj?.iconType || "inbox"
    };
  }, [type, typeStyles]);

  // Get trend styles
  const getTrendStyles = () => {
    if (!trend) return { text: 'text-gray-500', bg: '' };
    return trend === 'up' 
      ? { text: 'text-green-600', bg: 'bg-green-100' }
      : { text: 'text-red-600', bg: 'bg-red-100' };
  };

  const trendStyles = useMemo(() => getTrendStyles(), [trend]);

  // Get icon component based on icon type - returns JSX element
  const getIconComponent = (iconType) => {
    if (!iconType || typeof iconType !== 'string') {
      return <HiInbox className="h-5 w-5" />;
    }
    
    switch (iconType.toLowerCase()) {
      case 'inbox': return <HiInbox className="h-5 w-5" />;
      case 'trending-up': return <HiTrendingUp className="h-5 w-5" />;
      case 'trending-down': return <HiTrendingDown className="h-5 w-5" />;
      case 'shopping-cart': return <HiShoppingCart className="h-5 w-5" />;
      default: return <HiInbox className="h-5 w-5" />;
    }
  };

  // Create the icon element
  const iconElement = useMemo(() => {
    // If an explicitly provided icon exists and is a valid React element, use it
    if (React.isValidElement(icon)) {
      return icon;
    }
    
    // Otherwise generate a component based on style.iconType
    return getIconComponent(style.iconType);
  }, [icon, style.iconType]);

  return (
    <div 
      className={`
        flex flex-col p-6 bg-white rounded-2xl border ${style.borderColor}
        shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1
        ${className}
      `}
    >
      {/* Header with icon and title */}
      <div className="flex items-center mb-4">
        <div className={`
          flex items-center justify-center w-12 h-12 rounded-xl 
          ${style.iconBg} ${style.iconColor} mr-4 shadow-md
          ${iconWrapperClassName}
        `}>
          {iconElement}
        </div>
        <h4 className={`
          text-gray-700 font-semibold text-sm tracking-wide uppercase
          ${titleClassName}
        `}>
          {safeTitle}
        </h4>
      </div>

      {/* Value and subvalue */}
      <div className="pl-0">
        <p className={`
          text-2xl font-bold ${style.textColor} leading-tight mb-1
          ${valueClassName}
        `}>
          {safeValue}
          {trend && (
            <span className="ml-2 inline-flex items-center">
              {trend === 'up' ? (
                <HiTrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <HiTrendingDown className="h-4 w-4 text-red-500" />
              )}
            </span>
          )}
        </p>
        {safeSubValue && (
          <p className={`
            text-sm text-gray-600 font-medium
            ${subValueClassName}
          `}>
            {safeSubValue}
          </p>
        )}
      </div>
    </div>
  );
} 