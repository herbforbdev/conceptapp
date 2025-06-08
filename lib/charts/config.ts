import { ChartOptions } from 'chart.js';

// Common color schemes
export const colorSchemes = {
  primary: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
  success: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
  warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'],
  danger: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2']
};

// Common chart options
export const baseChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#4c5c68',
        padding: 15,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      padding: 10,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#1F2937',
      bodyColor: '#4B5563',
      borderColor: '#E5E7EB',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: '#6B7280'
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#E5E7EB'
      },
      ticks: {
        color: '#6B7280'
      }
    }
  }
};

// Line chart specific options
export const lineChartOptions: ChartOptions = {
  ...baseChartOptions,
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2,
      fill: true
    },
    point: {
      radius: 4,
      hitRadius: 10,
      hoverRadius: 6
    }
  }
};

// Bar chart specific options
export const barChartOptions: ChartOptions = {
  ...baseChartOptions,
  elements: {
    bar: {
      borderWidth: 1,
      borderRadius: 4
    }
  }
};

// Pie/Doughnut chart specific options
export const pieChartOptions: ChartOptions = {
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    legend: {
      ...baseChartOptions.plugins?.legend,
      position: 'right'
    }
  }
};

// Doughnut chart specific options with cutout
export const doughnutChartOptions = {
  ...pieChartOptions,
  cutout: '65%'
} as any;

// Helper function to create gradient backgrounds
export const createGradient = (ctx: CanvasRenderingContext2D, color: string) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, `${color}20`);
  gradient.addColorStop(1, `${color}05`);
  return gradient;
}; 