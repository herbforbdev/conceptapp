import { InventoryEntry, InventoryStats, InventoryFilters } from '@/types/inventory';
import { Product } from '@/types/products';

export const inventoryUtils = {
  // Get current stock for a product
  getCurrentStock(
    productId: string,
    movements: InventoryEntry[],
    excludeId?: string
  ): number {
    if (!productId || !movements?.length) return 0;
    
    const relevantMovements = movements
      .filter(m => {
        if (excludeId && m.id === excludeId) return false;
        // Check both possible field names for compatibility
        return m.productId === productId || (m as any).productid === productId;
      })
      .sort((a, b) => {
        const dateA = a.date.toDate();
        const dateB = b.date.toDate();
        return dateB.getTime() - dateA.getTime();
      });

    return relevantMovements[0]?.remainingQuantity || 0;
  },

  // Get total remaining inventory
  getTotalRemainingInventory(
    movements: InventoryEntry[],
    filters: InventoryFilters
  ): number {
    if (!movements?.length) return 0;
    
    const filteredMovements = this.filterMovementsByDate(movements, filters);
    const latestByProduct = new Map<string, InventoryEntry>();
    
    filteredMovements.forEach(movement => {
      // Check both possible field names for compatibility
      const movementProductId = movement.productId || (movement as any).productid;
      if (!movementProductId) return;
      
      const currentLatest = latestByProduct.get(movementProductId);
      if (!currentLatest || 
          (movement.date && currentLatest.date && 
           movement.date.toDate().getTime() > currentLatest.date.toDate().getTime())) {
        latestByProduct.set(movementProductId, movement);
      }
    });

    return Array.from(latestByProduct.values())
      .reduce((total, movement) => total + (movement.remainingQuantity || 0), 0);
  },

  // Get current month movements count
  getCurrentMonthMovements(movements: InventoryEntry[]): number {
    if (!movements?.length) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return movements.filter(movement => {
      if (!movement.date) return false;
      const moveDate = movement.date.toDate();
      return moveDate.getMonth() === currentMonth && 
             moveDate.getFullYear() === currentYear;
    }).length;
  },

  // Calculate total stock for a product type
  calculateTotalStockForType(
    movements: InventoryEntry[],
    products: Product[],
    productType: string
  ): number {
    if (!movements?.length || !products?.length) return 0;
    
    const productsByType = products.filter(p => 
      p.producttype?.toLowerCase() === productType.toLowerCase()
    );
    
    return productsByType.reduce((total, product) => {
      // Use product.id (document ID) to match against movement.productId
      const stock = this.getCurrentStock(product.id, movements);
      return total + stock;
    }, 0);
  },

  // Get total packaging stock
  getTotalPackagingStock(
    movements: InventoryEntry[],
    products: Product[]
  ): number {
    if (!movements?.length || !products?.length) return 0;
    
    const packagingProducts = products.filter(p => 
      p.producttype?.toLowerCase().includes('packaging')
    );
    
    return packagingProducts.reduce((total, product) => {
      const stock = this.getCurrentStock(product.id, movements);
      return total + stock;
    }, 0);
  },

  // Filter movements by date range
  filterMovementsByDate(
    movements: InventoryEntry[],
    filters: InventoryFilters
  ): InventoryEntry[] {
    return movements.filter(movement => {
      if (!movement.date) return false;
      const moveDate = movement.date.toDate();
      
      switch (filters.timePeriod) {
        case 'YEAR':
          return moveDate.getFullYear() === filters.year;
        
        case 'MONTH':
          return moveDate.getFullYear() === filters.year && 
                 moveDate.getMonth() === filters.month;
        
        case 'WEEK': {
          const firstDayOfMonth = new Date(filters.year!, filters.month!, 1);
          const weekOffset = firstDayOfMonth.getDay();
          const weekStart = new Date(filters.year!, filters.month!, 
            (filters.week! - 1) * 7 + 1 - weekOffset);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return moveDate >= weekStart && moveDate <= weekEnd;
        }
        
        case 'CUSTOM':
          if (filters.startDate && filters.endDate) {
            const startDate = new Date(filters.startDate);
            const endDate = new Date(filters.endDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            return moveDate >= startDate && moveDate <= endDate;
          }
          return true;
        
        default:
          return true;
      }
    });
  },

  // Calculate inventory statistics
  calculateInventoryStats(
    movements: InventoryEntry[],
    products: Product[],
    filters: InventoryFilters
  ): InventoryStats {
    return {
      totalInventory: this.getTotalRemainingInventory(movements, filters),
      monthlyMovements: this.getCurrentMonthMovements(movements),
      blockIceStock: this.calculateTotalStockForType(movements, products, 'Block Ice'),
      cubeIceStock: this.calculateTotalStockForType(movements, products, 'Cube Ice'),
      waterBottlingStock: this.calculateTotalStockForType(movements, products, 'Water Bottling'),
      packagingStock: this.getTotalPackagingStock(movements, products)
    };
  }
}; 