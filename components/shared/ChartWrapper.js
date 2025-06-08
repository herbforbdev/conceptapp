import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Import ApexCharts as a module instead of a component
const ApexChartsModule = dynamic(() => import('apexcharts'), { 
  ssr: false 
});

export default function ChartWrapper({ options, series, type, height }) {
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let chart = null;

    const initChart = async () => {
      try {
        // Wait for both the DOM element and ApexCharts to be ready
        if (!chartRef.current || !ApexChartsModule) {
          return;
        }

        // Make sure any existing chart is destroyed
        if (chart) {
          chart.destroy();
        }

        // Create new chart instance
        const ApexCharts = await ApexChartsModule;
        chart = new ApexCharts(chartRef.current, {
          ...options,
          series,
          chart: {
            ...(options.chart || {}),
            type,
            height
          }
        });

        await chart.render();
        setLoading(false);
      } catch (error) {
        console.error('Error initializing chart:', error);
        setLoading(false);
      }
    };

    initChart();

    // Cleanup function
    return () => {
      if (chart) {
        try {
          chart.destroy();
        } catch (error) {
          console.error('Error destroying chart:', error);
        }
      }
    };
  }, [options, series, type, height]);

  if (!options || !series) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-pulse bg-gray-100 rounded-lg h-full w-full" />
      </div>
    );
  }

  return (
    <div 
      ref={chartRef} 
      className="w-full h-full"
      style={{ minHeight: typeof height === 'number' ? height : '300px' }}
    />
  );
} 