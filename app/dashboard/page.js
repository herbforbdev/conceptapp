"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

// Chart.js setup
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

// Dynamic imports for charts (avoiding SSR issues)
const LineChart = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), { ssr: false });
import { HiTrendingUp, HiTrendingDown } from "react-icons/hi";
import { FaDollarSign, FaMoneyBillWave, FaIndustry, FaCubes, FaWarehouse, FaChartPie, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { useMasterData } from "@/hooks/useMasterData";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";
import { inventoryUtils } from "@/lib/inventory";
import Link from "next/link";

import { fetchSales, fetchCosts, fetchProduction, fetchInventory } from '@/services/firestore/dashboardService';
import { calculateGrowth, getTopProducts, getTopExpenses, calculateProductivity } from '@/lib/dashboard';





// Add helper for product name translation
const getTranslatedProductName = (product, t) => {
  if (!product) return 'N/A';
  const name = product.productid;
  if (!name) return 'N/A';
  const lower = name.toLowerCase();
  const type = product.producttype?.toLowerCase();
  const includesAny = (str, terms) => terms.some(term => str.includes(term));
  try {
    if (type === 'block ice' || includesAny(lower, ['bloc de glace', 'block ice'])) {
      if (lower.includes('5kg')) return t('products.items.blockIce.5kg');
      if (lower.includes('8kg')) return t('products.items.blockIce.8kg');
      if (lower.includes('30kg')) return t('products.items.blockIce.30kg');
    }
    if (type === 'cube ice' || includesAny(lower, ['glaçons', 'cube ice', 'ice cube'])) {
      if (lower.includes('1kg')) return t('products.items.cubeIce.1kg');
      if (lower.includes('2kg')) return t('products.items.cubeIce.2kg');
      if (lower.includes('5kg')) return t('products.items.cubeIce.5kg');
    }
    if (type === 'water bottling' || includesAny(lower, ['eau en bouteille', 'bottled water', 'water bottle'])) {
      if (lower.includes('600ml')) return t('products.items.waterBottling.600ml');
      if (lower.includes('750ml')) return t('products.items.waterBottling.750ml');
      if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.waterBottling.1_5L');
      if (lower.includes('5l')) return t('products.items.waterBottling.5L');
    }
    if (type?.includes('packaging') || lower.includes('package') || lower.includes('emballage')) {
      if (includesAny(lower, ['cube ice', 'glaçons'])) {
        if (lower.includes('1kg')) return t('products.items.packaging.cubeIce.1kg');
        if (lower.includes('2kg')) return t('products.items.packaging.cubeIce.2kg');
        if (lower.includes('5kg')) return t('products.items.packaging.cubeIce.5kg');
      }
      if (includesAny(lower, ['water', 'eau'])) {
        if (lower.includes('600ml')) return t('products.items.packaging.waterBottling.600ml');
        if (lower.includes('750ml')) return t('products.items.packaging.waterBottling.750ml');
        if (lower.includes('1.5l') || lower.includes('1,5l')) return t('products.items.packaging.waterBottling.1_5L');
        if (lower.includes('5l')) return t('products.items.packaging.waterBottling.5L');
      }
    }
  } catch (error) {
    console.warn('Translation error for product:', name, error);
  }
  return name;
};

// Helper function to generate month labels
const generateMonthLabels = (t) => {
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  return monthKeys.map(key => safeT(t, `months.${key}`, key));
};

// Safe translation helper
const safeT = (t, key, fallback) => {
  const value = t(key);
  return value !== key ? value : fallback || key;
};

export default function DashboardPage() {
  const { t: rawT } = useLanguage?.() || { t: (x) => x };
  // Safe t() to avoid rendering objects as React children
  const t = (key) => {
    const value = rawT(key);
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`Translation key '${key}' returned an object. Check your translation files for nested keys or missing leaf values.`);
      }
      return '';
    }
    return '';
  };
  const { products, loading: productsLoading } = useMasterData();
  const { data: inventoryMovements, loading: inventoryLoading } = useFirestoreCollection("Inventory");
  const [salesData, setSalesData] = useState({
    monthlySalesCDF: 0,
    monthlySalesUSD: 0,
    salesGrowth: 0,
    costsCDF: 0,
    costsUSD: 0,
    costsGrowth: 0,
    productivity: 0,
    dailySalesUSD: 0,
    dailySalesCDF: 0,
    dailyCostsUSD: 0,
    dailyCostsCDF: 0,
    monthlyProduction: 0
  });
  const [chartData, setChartData] = useState({
    iceBlockSales: { labels: [], datasets: [] },
    iceCubesSales: { labels: [], datasets: [] },
    salesPerActivity: { labels: [], datasets: [] },
    deliveryType: { labels: [], datasets: [] },
    salesAndCosts: { labels: [], datasets: [{ data: [] }, { data: [] }] },
    productionQuantity: { labels: [], datasets: [] },
    productionPercentage: { labels: [], datasets: [] }
  });
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [topExpenses, setTopExpenses] = useState([]);
  const [rawSales, setRawSales] = useState([]);
  const [rawCosts, setRawCosts] = useState([]);
  const [rawProduction, setRawProduction] = useState([]);
  const [chartType, setChartType] = useState('sales');

  // Stock Overview calculation
  const stockOverview = useMemo(() => {
    if (!products || !inventoryMovements) return [];
    return [
      {
        key: "blockIce",
        label: t("products.types.blockIce"),
        value: inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Block Ice"),
      },
      {
        key: "cubeIce",
        label: t("products.types.cubeIce"),
        value: inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Cube Ice"),
      },
      {
        key: "waterBottling",
        label: t("products.types.waterBottling"),
        value: inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Water Bottling"),
      },
      {
        key: "packagingCubeIce",
        label: t("products.types.packagingCubeIce"),
        value: inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Packaging for Ice Cube") + 
               inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Packaging For Ice Cube"),
      },
      {
        key: "packagingWaterBottling",
        label: t("products.types.packagingWaterBottling"),
        value: inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Packaging For Water Bottling") + 
               inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Packaging for Water Bottling"),
      },
      {
        key: "packagingWaterCans",
        label: t("products.types.packagingWaterCans"),
        value: inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Packaging For Water Cans") + 
               inventoryUtils.calculateTotalStockForType(inventoryMovements, products, "Packaging for Water Cans"),
      },
    ];
  }, [products, inventoryMovements, t]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Fetch sales, costs, production, inventory using service
        const [salesDataArr, costsDataArr, productionDataArr, inventoryData] = await Promise.all([
          fetchSales(),
          fetchCosts(),
          fetchProduction(),
          fetchInventory()
        ]);
        setRawSales(salesDataArr);
        setRawCosts(costsDataArr);
        setRawProduction(productionDataArr);

        // Calculate totals for current month only
        const currentMonthSales = salesDataArr.filter(sale => {
          if (!sale.date) return false;
          const saleDate = sale.date.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date);
          return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        });
        const currentMonthTotal = {
          cdf: currentMonthSales.reduce((sum, sale) => sum + (sale.amountFC || 0), 0),
          usd: currentMonthSales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0)
        };

        // Calculate totals for last month
        const lastMonthSales = salesDataArr.filter(sale => {
          if (!sale.date) return false;
          const saleDate = sale.date.seconds ? new Date(sale.date.seconds * 1000) : new Date(sale.date);
          return saleDate.getMonth() === lastMonth && saleDate.getFullYear() === lastMonthYear;
        });
        const lastMonthTotal = {
          cdf: lastMonthSales.reduce((sum, sale) => sum + (sale.amountFC || 0), 0),
          usd: lastMonthSales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0)
        };

        // Calculate production for current month only (for top card)
        const currentMonthProduction = productionDataArr.filter(prod => {
          if (!prod.date) return false;
          const prodDate = prod.date.seconds ? new Date(prod.date.seconds * 1000) : new Date(prod.date);
          return prodDate.getMonth() === currentMonth && prodDate.getFullYear() === currentYear;
        });
        const currentMonthProductionTotal = currentMonthProduction.reduce((sum, prod) => sum + (prod.quantityProduced || 0), 0);

        // Calculate growth using utility
        const salesGrowth = calculateGrowth(currentMonthTotal.usd, lastMonthTotal.usd);

        // Process costs data
        const currentMonthCosts = costsDataArr.filter(cost => {
          if (!cost.date) return false;
          const costDate = new Date(cost.date.seconds * 1000);
          return costDate.getMonth() === currentMonth && costDate.getFullYear() === currentYear;
        });

        const lastMonthCosts = costsDataArr.filter(cost => {
          if (!cost.date) return false;
          const costDate = new Date(cost.date.seconds * 1000);
          return costDate.getMonth() === lastMonth && costDate.getFullYear() === lastMonthYear;
        });

        const currentMonthCostsTotal = {
          cdf: currentMonthCosts.reduce((sum, cost) => sum + (cost.amountFC || 0), 0),
          usd: currentMonthCosts.reduce((sum, cost) => sum + (cost.amountUSD || 0), 0)
        };

        const lastMonthCostsTotal = {
          cdf: lastMonthCosts.reduce((sum, cost) => sum + (cost.amountFC || 0), 0),
          usd: lastMonthCosts.reduce((sum, cost) => sum + (cost.amountUSD || 0), 0)
        };

        // Calculate growth using utility
        const costsGrowth = calculateGrowth(currentMonthCostsTotal.usd, lastMonthCostsTotal.usd);

        // Calculate productivity using utility
        const productivity = calculateProductivity(productionDataArr, 1000); // targetProduction

        // Calculate today's sales and costs
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySales = salesDataArr.filter(sale => {
          if (!sale.date) return false;
          const saleDate = new Date(sale.date.seconds * 1000);
          return saleDate >= today;
        });
        const todaySalesTotal = {
          cdf: todaySales.reduce((sum, sale) => sum + (sale.amountFC || 0), 0),
          usd: todaySales.reduce((sum, sale) => sum + (sale.amountUSD || 0), 0)
        };
        const todayCosts = costsDataArr.filter(cost => {
          if (!cost.date) return false;
          const costDate = new Date(cost.date.seconds * 1000);
          return costDate >= today;
        });
        const todayCostsTotal = {
          cdf: todayCosts.reduce((sum, cost) => sum + (cost.amountFC || 0), 0),
          usd: todayCosts.reduce((sum, cost) => sum + (cost.amountUSD || 0), 0)
        };

        // Update sales data state
        setSalesData({
          monthlySalesCDF: currentMonthTotal.cdf,
          monthlySalesUSD: currentMonthTotal.usd,
          salesGrowth: parseFloat(salesGrowth.toFixed(2)),
          costsCDF: currentMonthCostsTotal.cdf,
          costsUSD: currentMonthCostsTotal.usd,
          costsGrowth: parseFloat(costsGrowth.toFixed(2)),
          productivity: parseFloat(productivity.toFixed(2)),
          dailySalesUSD: todaySalesTotal.usd,
          dailySalesCDF: todaySalesTotal.cdf,
          dailyCostsUSD: todayCostsTotal.usd,
          dailyCostsCDF: todayCostsTotal.cdf,
          monthlyProduction: currentMonthProductionTotal
        });

        // Process chart data
        // Ice Block Sales Chart
        const iceBlockSales = salesDataArr.filter(sale => sale.productid?.toLowerCase().includes('block'));
        const iceBlockLabels = [...new Set(iceBlockSales.map(sale => sale.productid))];
        const iceBlockValues = iceBlockLabels.map(label => 
          iceBlockSales
            .filter(sale => sale.productid === label)
            .reduce((sum, sale) => sum + (sale.amountUSD || 0), 0)
        );

        // Ice Cubes Sales Chart
        const iceCubesSales = salesDataArr.filter(sale => 
          sale.productid?.toLowerCase().includes('cube') || 
          sale.productid?.toLowerCase().includes('bottle')
        );
        const iceCubesLabels = [...new Set(iceCubesSales.map(sale => sale.productid))];
        const iceCubesValues = iceCubesLabels.map(label =>
          iceCubesSales
            .filter(sale => sale.productid === label)
            .reduce((sum, sale) => sum + (sale.amountUSD || 0), 0)
        );

        // Sales per Activity Chart
        const salesByChannel = salesDataArr.reduce((acc, sale) => {
          if (sale.channel) {
            acc[sale.channel] = (acc[sale.channel] || 0) + (sale.amountUSD || 0);
          }
          return acc;
        }, {});

        // Delivery Type Chart
        const salesByDelivery = salesDataArr.reduce((acc, sale) => {
          if (sale.deliveryType) {
            acc[sale.deliveryType] = (acc[sale.deliveryType] || 0) + (sale.amountUSD || 0);
          }
          return acc;
        }, {});

        // Production Charts
        const productionByType = productionDataArr.reduce((acc, prod) => {
          if (prod.productid) {
            acc[prod.productid] = (acc[prod.productid] || 0) + (prod.quantityProduced || 0);
          }
          return acc;
        }, {});

        // Process inventory data
        const currentInventory = inventoryData.reduce((acc, item) => {
          if (item.productid && item.remainingquantity) {
            acc[item.productid] = (acc[item.productid] || 0) + item.remainingquantity;
          }
          return acc;
        }, {});

        // Update chart data state
        setChartData({
          iceBlockSales: {
            labels: iceBlockLabels,
            datasets: [{
              label: 'Sales (USD)',
              data: iceBlockValues,
              backgroundColor: 'rgba(54, 162, 235, 0.7)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            }]
          },
          iceCubesSales: {
            labels: iceCubesLabels,
            datasets: [{
              label: 'Sales (USD)',
              data: iceCubesValues,
              backgroundColor: 'rgba(75, 192, 192, 0.7)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            }]
          },
          salesPerActivity: {
            labels: Object.keys(salesByChannel),
            datasets: [{
              data: Object.values(salesByChannel),
              backgroundColor: [
                'rgba(54, 162, 235, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)'
              ],
              borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)'
              ],
              borderWidth: 1,
            }]
          },
          deliveryType: {
            labels: Object.keys(salesByDelivery),
            datasets: [{
              data: Object.values(salesByDelivery),
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(75, 192, 192, 0.7)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)'
              ],
              borderWidth: 1,
            }]
          },
          productionQuantity: {
            labels: Object.keys(productionByType),
            datasets: [{
              label: 'Units Produced',
              data: Object.values(productionByType),
              backgroundColor: 'rgba(54, 162, 235, 0.7)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            }]
          },
          productionPercentage: {
            labels: Object.keys(productionByType),
            datasets: [{
              data: Object.values(productionByType).map(value => 
                (value / Object.values(productionByType).reduce((a, b) => a + b, 0)) * 100
              ),
              backgroundColor: [
                'rgba(54, 162, 235, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)'
              ],
              borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)'
              ],
              borderWidth: 1,
            }]
          },
          salesAndCosts: {
            labels: generateMonthLabels(t),
            datasets: [
              {
                label: 'Sales (USD)',
                data: (() => {
                  const monthlySales = new Array(12).fill(0);
                  salesDataArr.forEach(sale => {
                    if (sale.date) {
                      try {
                        const date = sale.date.toDate ? sale.date.toDate() : new Date(sale.date);
                        const month = date.getMonth();
                        monthlySales[month] += sale.amountUSD || 0;
                      } catch (error) {
                        // Skip invalid dates
                      }
                    }
                  });
                  return monthlySales;
                })(),
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                borderWidth: 2,
                fill: true
              },
              {
                label: 'Costs (USD)',
                data: (() => {
                  const monthlyCosts = new Array(12).fill(0);
                  costsDataArr.forEach(cost => {
                    if (cost.date) {
                      try {
                        const date = cost.date.toDate ? cost.date.toDate() : new Date(cost.date);
                        const month = date.getMonth();
                        monthlyCosts[month] += cost.amountUSD || 0;
                      } catch (error) {
                        // Skip invalid dates
                      }
                    }
                  });
                  return monthlyCosts;
                })(),
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                borderWidth: 2,
                fill: true
              }
            ]
          }
        });

        // Top products/expenses using utility
        const topProductsArr = getTopProducts(salesDataArr);
        setTopProducts(topProductsArr);
        const topExpensesArr = getTopExpenses(costsDataArr);
        setTopExpenses(topExpensesArr);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Animation variants for Framer Motion
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // Enhance chart options for advanced visuals
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#1c2541',
          font: { size: 14, family: 'inherit', weight: 'bold' },
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#fff',
        titleColor: '#1c2541',
        bodyColor: '#415A77',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString() || ctx.parsed || 0} USD`
        }
      },
      title: { display: false },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart',
    },
    elements: {
      bar: {
        borderRadius: 8,
        backgroundColor: ctx => ctx.dataset.backgroundColor,
        borderSkipped: false,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 6,
        shadowColor: 'rgba(54, 162, 235, 0.15)'
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#415A77',
          font: { size: 13, family: 'inherit' }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)'
        }
      },
      y: {
        ticks: {
          color: '#415A77',
          font: { size: 13, family: 'inherit' }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)'
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#1c2541',
          font: { size: 14, family: 'inherit', weight: 'bold' },
          usePointStyle: true,
          padding: 18,
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#fff',
        titleColor: '#1c2541',
        bodyColor: '#415A77',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: ctx => `${ctx.label}: ${ctx.parsed?.toLocaleString() || 0} USD`
        }
      },
      title: { display: false },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart',
    },
    layout: { padding: 10 },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#1c2541',
          font: { size: 14, family: 'inherit', weight: 'bold' },
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#fff',
        titleColor: '#1c2541',
        bodyColor: '#415A77',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString() || ctx.parsed || 0} USD`
        }
      },
      title: { display: false },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart',
    },
    elements: {
      line: {
        borderWidth: 3,
        fill: true,
        backgroundColor: ctx => ctx.dataset.label === 'Sales (USD)'
          ? 'rgba(54, 162, 235, 0.12)'
          : 'rgba(255, 99, 132, 0.12)',
        borderColor: ctx => ctx.dataset.label === 'Sales (USD)'
          ? 'rgba(54, 162, 235, 1)'
          : 'rgba(255, 99, 132, 1)',
        tension: 0.4,
      },
      point: {
        radius: 5,
        backgroundColor: ctx => ctx.dataset.label === 'Sales (USD)'
          ? 'rgba(54, 162, 235, 1)'
          : 'rgba(255, 99, 132, 1)',
        borderColor: '#fff',
        borderWidth: 2,
        hoverRadius: 8,
        hoverBackgroundColor: '#FFD700',
        hoverBorderColor: '#1c2541',
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#415A77',
          font: { size: 13, family: 'inherit' }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)'
        }
      },
      y: {
        ticks: {
          color: '#415A77',
          font: { size: 13, family: 'inherit' }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.04)'
        }
      }
    }
  };

  // 2. Fill in the mini sparklines for Sales and Costs cards
  const Sparkline = ({ data, color }) => {
    if (!data || data.length === 0) return <div className="h-6 w-full bg-gray-100 rounded mt-2" />;
    // Simple SVG sparkline
    const max = Math.max(...data);
    const min = Math.min(...data);
    const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 100}`).join(' ');
    return (
      <svg viewBox="0 0 100 100" className="h-6 w-full mt-2">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    );
  };

  // 3. Top Products/Expenses as horizontal bar charts
  const HorizontalBar = ({ label, value, percent, color }) => (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );

  // In the Recent Activity section, use the last 5 items from all three arrays, sorted by date descending
  const recentActivity = [...rawSales.map(item => ({...item, _type: 'Sale'})), ...rawCosts.map(item => ({...item, _type: 'Cost'}))]
    .filter(item => item.date)
    .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
    .slice(0, 5);

  // 2. Minimal, stylish sales/costs trend charts
  const minimalLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#1c2541',
          font: { size: 14, family: 'inherit', weight: 'bold' },
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#fff',
        titleColor: '#1c2541',
        bodyColor: '#415A77',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toLocaleString() || ctx.parsed || 0} USD`
        }
      },
      title: { display: false },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart',
    },
    elements: {
      line: {
        borderWidth: 3,
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        borderColor: 'rgba(59, 130, 246, 1)',
        tension: 0.4,
      },
      point: {
        radius: 0,
        hoverRadius: 0,
        borderWidth: 0,
      }
    },
    scales: {
      x: {
        display: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          color: '#415A77',
          font: { size: 11, family: 'inherit' },
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        display: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          color: '#415A77',
          font: { size: 13, family: 'inherit' }
        }
      }
    }
  };

  return (
    <div className="min-h-screen px-2 md:px-8 lg:px-16 py-4">
      <div className="max-w-8xl mx-auto">
        {/* Welcome Banner */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-8">
          <div className="rounded-2xl bg-gradient-to-r from-[#f7f7f7] via-[#fdf6e3] to-[#f7f7f7] shadow-lg p-8 flex flex-col md:flex-row items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#1c2541] mb-2">{t('dashboard.welcome') || "Welcome to your Dashboard!"}</h1>
              <p className="text-lg text-[#415A77]">{t('dashboard.subtitle') || "Monitor your business performance at a glance."}</p>
            </div>
            <div className="mt-6 md:mt-0 flex items-center gap-4">
              <FaChartPie className="h-16 w-16 text-[#FFD700] drop-shadow-lg" />
            </div>
          </div>
        </motion.div>

        {/* 1. Four Top Cards (frosted glass, blue/black, icons) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: t('dashboard.kpi.sales'),
              value: `${salesData.dailySalesUSD?.toLocaleString() || 0} USD`,
              subtitle: t('dashboard.summary.daily_sales') || "Today's Sales",
              icon: <FaDollarSign className="text-[#385e82]" />, bg: 'from-[#385e82] to-[#031b31]',
            },
            {
              title: t('dashboard.kpi.costs'),
              value: `${salesData.dailyCostsUSD?.toLocaleString() || 0} USD`,
              subtitle: t('dashboard.summary.daily_costs') || "Today's Costs",
              icon: <FaMoneyBillWave className="text-[#052c4f]" />, bg: 'from-[#052c4f] to-[#385e82]',
            },
            {
              title: t('dashboard.kpi.inventory'),
              value: stockOverview.reduce((a, b) => a + (b.value || 0), 0).toLocaleString(),
              subtitle: t('dashboard.kpi.stock_overview'),
              icon: <FaWarehouse className="text-[#1f4b72]" />, bg: 'from-[#1f4b72] to-[#385e82]',
            },
            {
              title: t('dashboard.kpi.production'),
              value: (salesData.monthlyProduction || 0).toLocaleString(),
              subtitle: t('dashboard.kpi.production'),
              icon: <FaIndustry className="text-[#073763]" />, bg: 'from-[#073763] to-[#031b31]',
            },
          ].map((card, idx) => (
            <div key={idx} className={`rounded-2xl shadow-lg p-6 flex flex-col justify-between backdrop-blur-md bg-gradient-to-br ${card.bg} bg-opacity-90 border border-[#385e82] transition-all duration-200`}> 
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 mr-4">{card.icon}</div>
                <div>
                  <div className="text-lg font-bold text-white">{card.title}</div>
                  <div className="text-xs text-[#b4c3d0] font-medium">{card.subtitle}</div>
                </div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">{card.value}</div>
            </div>
          ))}
        </div>

        {/* 2. Second row: left = stacked Sales/Costs, right = chart with dropdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="rounded-2xl bg-white/70 shadow p-6 flex flex-col items-start">
              <div className="text-2xl font-bold text-black mb-1">{t('dashboard.kpi.sales')}</div>
              <div className="text-4xl font-extrabold text-blue-700 mb-2">{String(salesData.monthlySalesUSD?.toLocaleString() || 0)} USD</div>
              <div className="text-sm text-gray-500 mb-2">{t('dashboard.summary.total_sales')}</div>
              <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">+{salesData.salesGrowth || 0}%</span>
            </div>
            <div className="rounded-2xl bg-white/70 shadow p-6 flex flex-col items-start">
              <div className="text-2xl font-bold text-black mb-1">{t('dashboard.kpi.costs')}</div>
              <div className="text-4xl font-extrabold text-black mb-2">{String(salesData.costsUSD?.toLocaleString() || 0)} USD</div>
              <div className="text-sm text-gray-500 mb-2">{t('dashboard.summary.total_costs')}</div>
              <span className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">{salesData.costsGrowth > 0 ? '+' : ''}{salesData.costsGrowth || 0}%</span>
            </div>
          </div>
          <div className="lg:col-span-2 rounded-2xl bg-white/80 shadow p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold text-black">{t('dashboard.sales_trend')}</div>
              <select className="rounded-lg border border-gray-200 px-3 py-1 text-sm bg-white/70 text-gray-900" onChange={e => setChartType(e.target.value)} value={chartType}>
                <option value="sales" className="text-gray-900">{t('dashboard.sales_trend')}</option>
                <option value="costs" className="text-gray-900">{t('dashboard.costs_trend')}</option>
              </select>
            </div>
            <div className="h-64">
              {chartType === 'sales' && chartData.salesAndCosts?.datasets?.[0] && Array.isArray(chartData.salesAndCosts.labels) ? (
                <LineChart
                  data={{
                    labels: chartData.salesAndCosts.labels,
                    datasets: [chartData.salesAndCosts.datasets[0]]
                  }}
                  options={minimalLineOptions}
                />
              ) : chartType === 'costs' && chartData.salesAndCosts?.datasets?.[1] && Array.isArray(chartData.salesAndCosts.labels) ? (
                <LineChart
                  data={{
                    labels: chartData.salesAndCosts.labels,
                    datasets: [chartData.salesAndCosts.datasets[1]]
                  }}
                  options={{
                    ...minimalLineOptions,
                    elements: {
                      ...minimalLineOptions.elements,
                      line: {
                        ...minimalLineOptions.elements.line,
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        borderColor: 'rgba(239, 68, 68, 1)'
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Bottom Section: Three Cards - Top 3s, Stock Overview, and Image */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Card 1: Top 3s with Toggle */}
          <TopThreeCard 
            topProducts={topProducts}
            topExpenses={topExpenses}
            productsLoading={productsLoading}
            products={products}
            t={t}
            getTranslatedProductName={getTranslatedProductName}
          />
          
          {/* Card 2: Stock Overview with Toggle */}
          <StockOverviewCard 
            stockOverview={stockOverview}
            t={t}
          />
          
          {/* Card 3: Image Card */}
          <ImageCard />
        </div>
      </div>
    </div>
  );
}

// Top Three Card Component with Toggle
const TopThreeCard = ({ topProducts, topExpenses, productsLoading, products, t, getTranslatedProductName }) => {
  const [showProducts, setShowProducts] = useState(true);

  return (
    <div className="rounded-2xl bg-white shadow-xl p-6 h-80 flex flex-col">
      {/* Toggle Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#031b31]">
          {showProducts ? t('dashboard.top_products') : t('dashboard.top_expenses')}
        </h3>
        <button
          onClick={() => setShowProducts(!showProducts)}
          className="px-3 py-1 rounded-full bg-[#031b31] text-white text-xs font-medium hover:bg-[#031b31]/90 transition-colors"
        >
          {showProducts ? 'Expenses' : 'Products'}
        </button>
      </div>

      {/* Content with Animation */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={showProducts ? 'products' : 'expenses'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {showProducts ? (
            <ul className="flex flex-col gap-2">
              {productsLoading ? (
                <li className="text-gray-400 italic animate-pulse">{t('common.loading')}</li>
              ) : topProducts.length === 0 ? (
                <li className="text-gray-400 italic">{t('dashboard.no_data')}</li>
              ) : topProducts.slice(0, 3).map((prod, idx) => {
                const prodKey = prod.productId || prod.productid;
                const matchedProduct = products?.find(p =>
                  String(p.id).trim().toLowerCase() === String(prod.productId ?? prod.productid ?? prodKey).trim().toLowerCase() ||
                  String(p.productid).trim().toLowerCase() === String(prod.productId ?? prod.productid ?? prodKey).trim().toLowerCase()
                );
                return (
                  <li key={prodKey || idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-3 border-l-4 border-[#031b31]">
                    <span className="font-semibold text-[#031b31] text-sm">
                      {getTranslatedProductName(matchedProduct, t) || t('common.unknown')}
                    </span>
                    <span className="font-bold text-[#031b31]">{String(prod.usd?.toLocaleString() || 0)} USD</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2">
              {topExpenses.length === 0 ? (
                <li className="text-gray-400 italic">{t('dashboard.no_data')}</li>
              ) : topExpenses.slice(0, 3).map((exp, idx) => (
                <li key={exp.expenseType || idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-3 border-l-4 border-[#031b31]">
                  <span className="font-semibold text-[#031b31] text-sm">{exp.expenseType}</span>
                  <span className="font-bold text-[#031b31]">{String(exp.usd?.toLocaleString() || 0)} USD</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Stock Overview Card Component with Toggle
const StockOverviewCard = ({ stockOverview, t }) => {
  const [showPackaging, setShowPackaging] = useState(false);

  const productStock = stockOverview.filter(item => ['blockIce', 'cubeIce', 'waterBottling'].includes(item.key));
  const packagingStock = stockOverview.filter(item => item.key.startsWith('packaging'));

  return (
    <div className="rounded-2xl bg-[#031b31] text-white shadow-xl p-6 h-80 flex flex-col">
      {/* Toggle Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">
          {showPackaging ? 'Packaging Stock' : 'Product Stock'}
        </h3>
        <button
          onClick={() => setShowPackaging(!showPackaging)}
          className="px-3 py-1 rounded-full bg-white text-[#031b31] text-xs font-medium hover:bg-gray-100 transition-colors"
        >
          {showPackaging ? 'Products' : 'Packaging'}
        </button>
      </div>

      {/* Content with Animation */}
      <div className="flex-1">
        <motion.div
          key={showPackaging ? 'packaging' : 'products'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {showPackaging ? (
            <div className="grid grid-cols-1 gap-3 h-full">
              {packagingStock.map(item => (
                <div key={item.key} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                  <span className="text-sm text-gray-200">{item.label}</span>
                  <span className="text-lg font-bold">{String(item.value?.toLocaleString() ?? 0)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 h-full">
              {productStock.map(item => (
                <div key={item.key} className="flex items-center justify-between bg-white/10 rounded-lg p-4">
                  <span className="text-sm text-gray-200">{item.label}</span>
                  <span className="text-xl font-bold">{String(item.value?.toLocaleString() ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Image Card Component
const ImageCard = () => {
  return (
    <div className="rounded-2xl bg-white shadow-xl overflow-hidden h-80 flex items-center justify-center">
      <img 
        src="/IM-Glacons 1.JPG" 
        alt="Ice Concept Product" 
        className="object-cover h-full w-full"
      />
    </div>
  );
};

// Updated TopCard component with iconBg and sparkline props
const TopCard = ({ title, amount, subAmount, icon, iconBg, sparkline, children }) => (
  <div className="flex flex-col py-4 px-5 shadow-md rounded-2xl h-36 bg-white transition-all hover:scale-105 hover:shadow-xl">
    <div className="flex items-center mb-2">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-md mr-3 ${iconBg}`}>{icon}</div>
      <h4 className="text-[#1c2541] font-semibold text-base truncate">{title}</h4>
    </div>
    <div className="pl-16">
      <p className="text-xl font-bold text-[#1c2541] leading-tight">{amount}</p>
      {subAmount && <p className="text-sm text-[#415A77] leading-tight">{subAmount}</p>}
      {sparkline}
      {children}
    </div>
  </div>
);

// Add SummaryCard component
const SummaryCard = ({ label, value, icon }) => (
  <div className="flex items-center bg-white rounded-xl shadow p-4 gap-4">
    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200">{icon}</div>
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  </div>
);
