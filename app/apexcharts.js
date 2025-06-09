"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Create a fallback component in case the chart fails to load
const ChartFallback = ({ width, height }) => (
  <div 
    style={{ width: width || '100%', height: height || 350 }} 
    className="flex items-center justify-center bg-gray-100 rounded-lg"
  >
    <div className="text-gray-500">Chart unavailable</div>
  </div>
);

// Dynamically import with error handling - this prevents build errors
const ApexChartComponent = dynamic(
  () => import('react-apexcharts').catch(() => {
    console.warn('Failed to load react-apexcharts. Using fallback component.');
    const Fallback = ({ width, height }) => 
      <ChartFallback width={width} height={height} />;
    Fallback.displayName = 'ApexChartsFallback';
    return Fallback;
  }),
  { 
    ssr: false,
    loading: ({ width, height }) => (
      <div 
        style={{ width: width || '100%', height: height || 350 }} 
        className="flex items-center justify-center bg-gray-100 rounded-lg"
      >
        <div className="text-gray-400">Loading chart...</div>
      </div>
    )
  }
);

// Client-side only wrapper for ApexCharts
function Chart({ options, series, type, width, height }) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Default chart options
  const defaultOptions = {
    chart: {
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      },
      background: 'transparent'
    },
    theme: {
      mode: 'light'
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    colors: ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#f43f5e'],
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300
          }
        }
      },
      {
        breakpoint: 640,
        options: {
          chart: {
            height: 250
          }
        }
      }
    ]
  };

  // Merge default options with provided options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    chart: {
      ...defaultOptions.chart,
      ...options?.chart
    }
  };

  if (!mounted) {
    return <div className="w-full h-full flex items-center justify-center">Loading chart...</div>;
  }

  return (
    <ApexChartComponent
      options={mergedOptions}
      series={series}
      type={type || 'line'}
      width={width || '100%'}
      height={height || 350}
    />
  );
}

Chart.displayName = 'Chart';

export default Chart; 