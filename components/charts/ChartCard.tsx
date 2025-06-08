import { Card } from 'flowbite-react';
import { ReactNode } from 'react';
import { HiRefresh } from 'react-icons/hi';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  onRefresh?: () => void;
  className?: string;
  height?: string | number;
}

export const ChartCard = ({
  title,
  children,
  onRefresh,
  className = '',
  height = 300
}: ChartCardProps) => {
  return (
    <Card className={`!rounded-2xl overflow-hidden ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <HiRefresh className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>
      <div style={{ height }}>{children}</div>
    </Card>
  );
}; 