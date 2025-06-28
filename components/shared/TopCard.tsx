import { ReactNode } from 'react';
import { HiTrendingUp, HiTrendingDown, HiInbox, HiShoppingCart } from 'react-icons/hi';

export interface TopCardProps {
  title: string;
  value: string | number;
  subValue?: string | number;
  icon?: ReactNode;
  type?: keyof typeof typeStyles;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string | number;
  className?: string;
  titleClassName?: string;
  valueClassName?: string;
  subValueClassName?: string;
  iconWrapperClassName?: string;
}

// Default style mapping for different card types with modern colors
const typeStyles = {
  // Sales related
  'Total Sales': { 
    iconBg: 'bg-blue-500', 
    iconColor: 'text-white', 
    textColor: 'text-blue-700',
    borderColor: 'border-blue-100',
    iconType: 'inbox' 
  },
  'Average Sale': { 
    iconBg: 'bg-green-500', 
    iconColor: 'text-white', 
    textColor: 'text-green-700',
    borderColor: 'border-green-100',
    iconType: 'trending-up' 
  },
  'Best Selling': { 
    iconBg: 'bg-yellow-500', 
    iconColor: 'text-white', 
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-100',
    iconType: 'shopping-cart' 
  },
  'Sales Growth': { 
    iconBg: 'bg-purple-500', 
    iconColor: 'text-white', 
    textColor: 'text-purple-700',
    borderColor: 'border-purple-100',
    iconType: 'trending-up' 
  },
  
  // Costs related
  'Total Costs': { 
    iconBg: 'bg-red-500', 
    iconColor: 'text-white', 
    textColor: 'text-red-700',
    borderColor: 'border-red-100',
    iconType: 'inbox' 
  },
  'Monthly Costs': { 
    iconBg: 'bg-orange-500', 
    iconColor: 'text-white', 
    textColor: 'text-orange-700',
    borderColor: 'border-orange-100',
    iconType: 'trending-up' 
  },
  'Cost Growth': { 
    iconBg: 'bg-pink-500', 
    iconColor: 'text-white', 
    textColor: 'text-pink-700',
    borderColor: 'border-pink-100',
    iconType: 'trending-up' 
  },
  
  // Inventory related
  'Total Inventory': { 
    iconBg: 'bg-indigo-500', 
    iconColor: 'text-white', 
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-100',
    iconType: 'inbox' 
  },
  'totalInventory': { 
    iconBg: 'bg-indigo-500', 
    iconColor: 'text-white', 
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-100',
    iconType: 'inbox' 
  },
  'monthlyMovements': { 
    iconBg: 'bg-emerald-500', 
    iconColor: 'text-white', 
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-100',
    iconType: 'trending-up' 
  },
  'blockIce': { 
    iconBg: 'bg-blue-500', 
    iconColor: 'text-white', 
    textColor: 'text-blue-700',
    borderColor: 'border-blue-100',
    iconType: 'inbox' 
  },
  'cubeIce': { 
    iconBg: 'bg-cyan-500', 
    iconColor: 'text-white', 
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-100',
    iconType: 'inbox' 
  },
  'waterBottling': { 
    iconBg: 'bg-teal-500', 
    iconColor: 'text-white', 
    textColor: 'text-teal-700',
    borderColor: 'border-teal-100',
    iconType: 'inbox' 
  },
  'waterCans': { 
    iconBg: 'bg-sky-500', 
    iconColor: 'text-white', 
    textColor: 'text-sky-700',
    borderColor: 'border-sky-100',
    iconType: 'inbox' 
  },
  'packaging': { 
    iconBg: 'bg-purple-500', 
    iconColor: 'text-white', 
    textColor: 'text-purple-700',
    borderColor: 'border-purple-100',
    iconType: 'inbox' 
  },
  'Stock Level': { 
    iconBg: 'bg-cyan-500', 
    iconColor: 'text-white', 
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-100',
    iconType: 'inbox' 
  },
  'Monthly Movement': { 
    iconBg: 'bg-teal-500', 
    iconColor: 'text-white', 
    textColor: 'text-teal-700',
    borderColor: 'border-teal-100',
    iconType: 'trending-up' 
  },
  
  // Production related
  'Total Production': { 
    iconBg: 'bg-emerald-500', 
    iconColor: 'text-white', 
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-100',
    iconType: 'inbox' 
  },
  'Production Rate': { 
    iconBg: 'bg-lime-500', 
    iconColor: 'text-white', 
    textColor: 'text-lime-700',
    borderColor: 'border-lime-100',
    iconType: 'trending-up' 
  },
  'Efficiency': { 
    iconBg: 'bg-amber-500', 
    iconColor: 'text-white', 
    textColor: 'text-amber-700',
    borderColor: 'border-amber-100',
    iconType: 'trending-up' 
  },
  
  // Default style
  'default': { 
    iconBg: 'bg-gray-500', 
    iconColor: 'text-white', 
    textColor: 'text-gray-700',
    borderColor: 'border-gray-100',
    iconType: 'inbox' 
  }
} as const;

export default function TopCard({ 
  title, 
  value, 
  subValue, 
  icon, 
  type = 'default',
  trend,
  trendValue,
  className = '',
  titleClassName = '',
  valueClassName = '',
  subValueClassName = '',
  iconWrapperClassName = ''
}: TopCardProps) {
  const style = typeStyles[type] || typeStyles.default;
  
  const getIconComponent = (iconType: string) => {
    switch (iconType.toLowerCase()) {
      case 'inbox': return <HiInbox className="h-5 w-5" />;
      case 'trending-up': return <HiTrendingUp className="h-5 w-5" />;
      case 'trending-down': return <HiTrendingDown className="h-5 w-5" />;
      case 'shopping-cart': return <HiShoppingCart className="h-5 w-5" />;
      default: return <HiInbox className="h-5 w-5" />;
    }
  };

  const iconElement = icon || getIconComponent(style.iconType);
  
  const renderTrendIcon = () => {
    if (!trend) return null;
    
    const iconProps = { 
      className: 'h-4 w-4 ' + (trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500')
    };
    
    return trend === 'up' ? <HiTrendingUp {...iconProps} /> : <HiTrendingDown {...iconProps} />;
  };

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
          {title}
        </h4>
      </div>

      {/* Value and subvalue */}
      <div className="pl-0">
        <p className={`
          text-xl font-bold ${style.textColor} leading-tight mb-1
          ${valueClassName}
        `}>
          {value}
          {trend && (
            <span className="ml-2 inline-flex items-center">
              {renderTrendIcon()}
              {trendValue && <span className="ml-1 text-xs">{trendValue}</span>}
            </span>
          )}
        </p>
        {subValue && (
          <p className={`
            text-sm text-gray-600 font-medium
            ${subValueClassName}
          `}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
} 