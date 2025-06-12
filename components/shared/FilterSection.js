import React from 'react';
import { Card, Label, Select } from 'flowbite-react';

export default function FilterSection({
  filters,
  onFilterChange,
  activityTypes,
  products,
  colorTheme = 'red',
  t, // Translation function
  showMonthFilter = true,
  showActivityFilter = true,
  showProductFilter = true,
  showMovementFilter = false,
  showChannelFilter = false,
  showStatusFilter = false,
  customFilters = null
}) {
  // Map color themes to Tailwind classes
  const themeClasses = {
    red: {
      border: 'border-red-300',
      gradient: 'from-red-50 to-red-100',
      borderB: 'border-red-200',
      text: 'text-red-700',
      select: 'border-red-200 focus:ring-red-500 focus:border-red-500'
    },
    blue: {
      border: 'border-blue-300',
      gradient: 'from-blue-50 to-blue-100',
      borderB: 'border-blue-200',
      text: 'text-blue-700',
      select: 'border-blue-200 focus:ring-blue-500 focus:border-blue-500'
    },
    purple: {
      border: 'border-purple-300',
      gradient: 'from-purple-50 to-purple-100',
      borderB: 'border-purple-200',
      text: 'text-purple-700',
      select: 'border-purple-200 focus:ring-purple-500 focus:border-purple-500'
    },
    green: {
      border: 'border-green-300',
      gradient: 'from-green-50 to-green-100',
      borderB: 'border-green-200',
      text: 'text-green-700',
      select: 'border-green-200 focus:ring-green-500 focus:border-green-500'
    }
  };

  const theme = themeClasses[colorTheme];

  return (
    <Card className={`mb-6 bg-white border ${theme.border} shadow-xl rounded-2xl overflow-hidden`}>
      <div className={`bg-gradient-to-r ${theme.gradient} border-b ${theme.borderB} rounded-t-2xl`}>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {showMonthFilter && (
              <div>
                <Label htmlFor="monthSelect" className={`font-medium mb-1.5 block ${theme.text}`}>
                  {String(t('common.month') || 'Month')}
                </Label>
                <Select
                  id="monthSelect"
                  value={filters.selectedMonth}
                  onChange={(e) => onFilterChange('selectedMonth', e.target.value)}
                  className={`w-full bg-white rounded-lg ${theme.select}`}
                >
                  <option value="">{String(t('filters.allMonths') || 'All Months')}</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {String(t(`months.${new Date(0, i).toLocaleString('default', { month: 'long' }).toLowerCase()}`) || new Date(0, i).toLocaleString('default', { month: 'long' }))}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {showActivityFilter && (
              <div>
                <Label htmlFor="activityType" className={`font-medium mb-1.5 block ${theme.text}`}>
                  {String(t('common.activityType') || 'Activity Type')}
                </Label>
                <Select
                  id="activityType"
                  value={filters.selectedActivityType}
                  onChange={(e) => onFilterChange('selectedActivityType', e.target.value)}
                  className={`w-full bg-white rounded-lg ${theme.select}`}
                >
                  <option value="">{String(t('filters.allActivityTypes') || 'All Activity Types')}</option>
                  {activityTypes?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {showProductFilter && (
              <div>
                <Label htmlFor="product" className={`font-medium mb-1.5 block ${theme.text}`}>
                  {String(t('common.product') || 'Product')}
                </Label>
                <Select
                  id="product"
                  value={filters.selectedProduct}
                  onChange={(e) => onFilterChange('selectedProduct', e.target.value)}
                  className={`w-full bg-white rounded-lg ${theme.select}`}
                >
                  <option value="">{String(t('filters.allProducts') || 'All Products')}</option>
                  {products?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.productid || product.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {showMovementFilter && (
              <div>
                <Label htmlFor="movementType" className={`font-medium mb-1.5 block ${theme.text}`}>
                  {String(t('inventory.filters.movementType') || 'Movement Type')}
                </Label>
                <Select
                  id="movementType"
                  value={filters.selectedMovementType}
                  onChange={(e) => onFilterChange('selectedMovementType', e.target.value)}
                  className={`w-full bg-white rounded-lg ${theme.select}`}
                >
                  <option value="">{String(t('inventory.filters.allMovementTypes') || 'All Movement Types')}</option>
                  <option value="IN">{String(t('inventory.table.stockIn') || 'Stock In')}</option>
                  <option value="OUT">{String(t('inventory.table.stockOut') || 'Stock Out')}</option>
                  <option value="ADJUSTMENT">{String(t('inventory.table.adjustment') || 'Adjustment')}</option>
                </Select>
              </div>
            )}

            {showChannelFilter && (
              <div>
                <Label htmlFor="channel" className={`font-medium mb-1.5 block ${theme.text}`}>
                  {String(t('sales.filters.channel') || 'Channel')}
                </Label>
                <Select
                  id="channel"
                  value={filters.selectedChannel}
                  onChange={(e) => onFilterChange('selectedChannel', e.target.value)}
                  className={`w-full bg-white rounded-lg ${theme.select}`}
                >
                  <option value="">{String(t('filters.allChannels') || 'All Channels')}</option>
                  <option value="OnSite">{String(t('sales.channels.onSite') || 'On-Site')}</option>
                  <option value="Truck Delivery">{String(t('sales.channels.truckDelivery') || 'Truck Delivery')}</option>
                  <option value="Motorcycle Delivery">{String(t('sales.channels.motorcycleDelivery') || 'Motorcycle Delivery')}</option>
                </Select>
              </div>
            )}

            {showStatusFilter && (
              <div>
                <Label htmlFor="status" className={`font-medium mb-1.5 block ${theme.text}`}>
                  {String(t('common.status') || 'Status')}
                </Label>
                <Select
                  id="status"
                  value={filters.selectedStatus}
                  onChange={(e) => onFilterChange('selectedStatus', e.target.value)}
                  className={`w-full bg-white rounded-lg ${theme.select}`}
                >
                  <option value="">{String(t('filters.allStatus') || 'All Status')}</option>
                  <option value="completed">{String(t('common.completed') || 'Completed')}</option>
                  <option value="pending">{String(t('common.pending') || 'Pending')}</option>
                  <option value="cancelled">{String(t('common.cancelled') || 'Cancelled')}</option>
                </Select>
              </div>
            )}

            {customFilters}
          </div>
        </div>
      </div>
    </Card>
  );
} 