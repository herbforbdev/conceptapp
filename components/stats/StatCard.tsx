import { ReactNode } from 'react';
import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string | number;
  growth?: number;
  icon?: ReactNode;
  color?: string;
  className?: string;
}

export const StatCard = ({
  title,
  value,
  subValue,
  growth,
  icon,
  color = 'bg-blue-500',
  className = ''
}: StatCardProps) => {
  return (
    <div className={`flex flex-col p-4 bg-white shadow-md rounded-lg hover:shadow-lg transition-all h-28 ${className}`}>
      <div className="flex items-center mb-2">
        {icon && (
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${color} text-white mr-2`}>
            {icon}
          </div>
        )}
        <h4 className="text-gray-700 font-semibold text-xs truncate">{title}</h4>
      </div>
      <div className={icon ? 'pl-10' : ''}>
        <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
        <p className="text-sm font-bold text-gray-900 leading-tight truncate">{value}</p>
        {subValue && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{subValue}</p>
        )}
        {typeof growth === 'number' && (
          <div className="flex items-center mt-1">
            {growth >= 0 ? (
              <HiTrendingUp className="text-green-500 mr-1" />
            ) : (
              <HiTrendingDown className="text-red-500 mr-1" />
            )}
            <span className={`text-xs font-medium ${
              growth >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {Math.abs(growth).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}; 