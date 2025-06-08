import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type ChartType = 'line' | 'bar' | 'pie';

interface ChartBuilderProps<TType extends ChartType> {
  type: TType;
  data: ChartData<TType>;
  title: string;
  xKey: string;
  yKey: string;
  options?: ChartOptions<TType>;
}

function ChartBuilder<TType extends ChartType>({
  type,
  data,
  title,
  xKey,
  yKey,
  options = {}
}: ChartBuilderProps<TType>) {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 10,
          padding: 20,
          color: '#4c5c68'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        displayColors: true
      },
      title: {
        display: true,
        text: title,
        color: '#1f2937',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  const scaleOptions = type !== 'pie' ? {
    scales: {
      x: {
        title: {
          display: true,
          text: xKey
        },
        grid: {
          display: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 10
          }
        }
      },
      y: {
        title: {
          display: true,
          text: yKey
        },
        beginAtZero: true,
        grid: {
          color: '#E5E7EB'
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 10
          }
        }
      }
    }
  } : {};

  const renderChart = () => {
    const commonOptions = {
      ...baseOptions,
      ...scaleOptions,
      ...options
    };

    switch (type) {
      case 'line': {
        const lineData = data as ChartData<'line'>;
        const lineOptions = commonOptions as ChartOptions<'line'>;
        return <Line data={lineData} options={lineOptions} />;
      }
      case 'bar': {
        const barData = data as ChartData<'bar'>;
        const barOptions = commonOptions as ChartOptions<'bar'>;
        return <Bar data={barData} options={barOptions} />;
      }
      case 'pie': {
        const pieData = data as ChartData<'pie'>;
        const pieOptions = commonOptions as ChartOptions<'pie'>;
        return <Pie data={pieData} options={pieOptions} />;
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      <div className="h-[300px]">
        {renderChart()}
      </div>
    </div>
  );
}

export default ChartBuilder; 