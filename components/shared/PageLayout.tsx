import React from 'react';
import { Card } from 'flowbite-react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  subtitle,
  actions
}) => {
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      {/* Header */}
      {(title || subtitle || actions) && (
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              {title && <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>}
              {subtitle && <p className="text-gray-600">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

export default PageLayout; 