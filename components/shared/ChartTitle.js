import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ChartTitle({ 
  title,
  subtitle,
  className = '',
  size = 'normal' // 'small', 'normal', 'large'
}) {
  const { t } = useLanguage();

  const sizeClasses = {
    small: 'text-sm',
    normal: 'text-lg',
    large: 'text-xl'
  };

  return (
    <div className={`mb-4 ${className}`}>
      <h3 className={`${sizeClasses[size]} font-semibold text-[#4c5c68] text-center`}>
        {t(`charts.${title.toLowerCase().replace(/\s+/g, '_')}`)}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-500 text-center mt-1">
          {t(`charts.${subtitle.toLowerCase().replace(/\s+/g, '_')}`)}
        </p>
      )}
    </div>
  );
}

// Helper function to get translated chart options
export function getTranslatedChartOptions(t) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#4c5c68',
          font: {
            size: 11
          },
          generateLabels: (chart) => {
            const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
            return labels.map(label => ({
              ...label,
              text: t(`charts.legend.${label.text.toLowerCase().replace(/\s+/g, '_')}`)
            }));
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const translatedLabel = t(`charts.tooltip.${label.toLowerCase().replace(/\s+/g, '_')}`);
            return `${translatedLabel}: ${context.formattedValue}`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: t('charts.axes.y'),
          color: '#4c5c68'
        },
        ticks: {
          color: '#4c5c68'
        }
      },
      x: {
        title: {
          display: true,
          text: t('charts.axes.x'),
          color: '#4c5c68'
        },
        ticks: {
          color: '#4c5c68'
        }
      }
    }
  };
} 