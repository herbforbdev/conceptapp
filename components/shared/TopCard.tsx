import { ReactNode } from 'react';
import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi';

export interface TopCardProps {
  title: string;
  value: string | number;
  subValue?: string | number;
  icon?: ReactNode;
  type?: keyof typeof typeStyles;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string | number;
  className?: string;
}

// Default style mapping for different card types
const typeStyles = {
  // Sales related
  'Total Sales': { bg: 'bg-blue-600', text: 'text-blue-700' },
  'Average Sale': { bg: 'bg-green-600', text: 'text-green-700' },
  'Best Selling': { bg: 'bg-yellow-600', text: 'text-yellow-700' },
  'Sales Growth': { bg: 'bg-purple-600', text: 'text-purple-700' },
  
  // Costs related
  'Total Costs': { bg: 'bg-red-600', text: 'text-red-700' },
  'Monthly Costs': { bg: 'bg-orange-600', text: 'text-orange-700' },
  'Cost Growth': { bg: 'bg-pink-600', text: 'text-pink-700' },
  
  // Inventory related
  'Total Inventory': { bg: 'bg-indigo-600', text: 'text-indigo-700' },
  'Stock Level': { bg: 'bg-cyan-600', text: 'text-cyan-700' },
  'Monthly Movement': { bg: 'bg-teal-600', text: 'text-teal-700' },
  
  // Production related
  'Total Production': { bg: 'bg-emerald-600', text: 'text-emerald-700' },
  'Production Rate': { bg: 'bg-lime-600', text: 'text-lime-700' },
  'Efficiency': { bg: 'bg-amber-600', text: 'text-amber-700' },
  
  // Default style
  'default': { bg: 'bg-gray-600', text: 'text-gray-700' }
} as const;

export default function TopCard({ 
  title, 
  value, 
  subValue, 
  icon, 
  type = 'default',
  trend,
  trendValue,
  className = ''
}: TopCardProps) {
  const style = typeStyles[type] || typeStyles.default;
  
  const renderTrendIcon = () => {
    if (!trend) return null;
    
    const iconProps = { 
      size: 16,
      className: trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
    };
    
    return trend === 'up' ? <HiTrendingUp {...iconProps} /> : <HiTrendingDown {...iconProps} />;
  };

  return (
    <div className={`flex flex-col p-4 bg-white shadow-md rounded-lg hover:shadow-lg transition-all h-28 ${className}`}>
      <div className="flex items-center mb-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${style.bg} text-white mr-2`}>
          {icon}
        </div>
        <h4 className="text-gray-700 font-semibold text-xs truncate">{title}</h4>
      </div>
      <div className="pl-10">
        <p className={`text-sm font-bold ${style.text} leading-tight truncate`}>
          {value}
          {trend && (
            <span className="ml-2 inline-flex items-center">
              {renderTrendIcon()}
              {trendValue && <span className="ml-1 text-xs">{trendValue}</span>}
            </span>
          )}
        </p>
        {subValue && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{subValue}</p>
        )}
      </div>
    </div>
  );
} 