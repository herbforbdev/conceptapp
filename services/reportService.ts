// services/reportService.ts
// Phase 4: Weekly Reports & Email Integration

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp,
  startAfter,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notificationService } from './firestore/notificationService';

interface WeeklyStats {
  production: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    topProducts: Array<{ name: string; quantity: number }>;
  };
  sales: {
    total: number;
    revenue: number;
    topChannels: Array<{ channel: string; amount: number }>;
    topProducts: Array<{ name: string; quantity: number }>;
  };
  inventory: {
    movements: number;
    lowStockItems: Array<{ name: string; stock: number; threshold: number }>;
    topMovements: Array<{ product: string; movement: number }>;
  };
  costs: {
    total: number;
    topCategories: Array<{ type: string; amount: number }>;
    budgetStatus: Array<{ type: string; spent: number; budget: number; percentage: number }>;
  };
  users: {
    activeUsers: number;
    newUsers: number;
    totalLogins: number;
    topActiveUsers: Array<{ name: string; logins: number }>;
  };
}

export class ReportService {
  // Generate weekly stats for a given date range
  async generateWeeklyStats(startDate: Date, endDate: Date): Promise<WeeklyStats> {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    try {
      const [
        productionStats,
        salesStats,
        inventoryStats,
        costsStats,
        userStats
      ] = await Promise.all([
        this.getProductionStats(startTimestamp, endTimestamp),
        this.getSalesStats(startTimestamp, endTimestamp),
        this.getInventoryStats(startTimestamp, endTimestamp),
        this.getCostsStats(startTimestamp, endTimestamp),
        this.getUserStats(startTimestamp, endTimestamp)
      ]);

      return {
        production: productionStats,
        sales: salesStats,
        inventory: inventoryStats,
        costs: costsStats,
        users: userStats
      };
    } catch (error) {
      console.error('Error generating weekly stats:', error);
      throw error;
    }
  }

  // Get production statistics
  private async getProductionStats(startDate: Timestamp, endDate: Timestamp) {
    try {
      const productionQuery = query(
        collection(db, 'production'),
        where('productionDate', '>=', startDate),
        where('productionDate', '<=', endDate),
        orderBy('productionDate', 'desc')
      );

      const productionSnapshot = await getDocs(productionQuery);
      const productions = productionSnapshot.docs.map(doc => doc.data());

      const total = productions.length;
      const completed = productions.filter(p => p.status === 'completed').length;
      const pending = productions.filter(p => p.status === 'pending').length;
      const cancelled = productions.filter(p => p.status === 'cancelled').length;

      // Get top products by quantity
      const productQuantities = {};
      productions.forEach(prod => {
        const productName = prod.productName || 'Produit inconnu';
        productQuantities[productName] = (productQuantities[productName] || 0) + (prod.packagingQuantity || 0);
      });

      const topProducts = Object.entries(productQuantities)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return {
        total,
        completed,
        pending,
        cancelled,
        topProducts
      };
    } catch (error) {
      console.error('Error getting production stats:', error);
      return { total: 0, completed: 0, pending: 0, cancelled: 0, topProducts: [] };
    }
  }

  // Get sales statistics
  private async getSalesStats(startDate: Timestamp, endDate: Timestamp) {
    try {
      const salesQuery = query(
        collection(db, 'sales'),
        where('saleDate', '>=', startDate),
        where('saleDate', '<=', endDate),
        orderBy('saleDate', 'desc')
      );

      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map(doc => doc.data());

      const total = sales.length;
      const revenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);

      // Top channels
      const channelAmounts = {};
      sales.forEach(sale => {
        const channel = sale.salesChannel || 'Inconnu';
        channelAmounts[channel] = (channelAmounts[channel] || 0) + (sale.totalAmount || 0);
      });

      const topChannels = Object.entries(channelAmounts)
        .map(([channel, amount]) => ({ channel, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      // Top products
      const productQuantities = {};
      sales.forEach(sale => {
        const productName = sale.productName || 'Produit inconnu';
        productQuantities[productName] = (productQuantities[productName] || 0) + (sale.quantity || 0);
      });

      const topProducts = Object.entries(productQuantities)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return {
        total,
        revenue,
        topChannels,
        topProducts
      };
    } catch (error) {
      console.error('Error getting sales stats:', error);
      return { total: 0, revenue: 0, topChannels: [], topProducts: [] };
    }
  }

  // Get inventory statistics
  private async getInventoryStats(startDate: Timestamp, endDate: Timestamp) {
    try {
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const inventorySnapshot = await getDocs(inventoryQuery);
      const movements = inventorySnapshot.docs.map(doc => doc.data());

      const movementsCount = movements.length;

      // Get current stock levels and identify low stock items
      const currentStockQuery = query(collection(db, 'products'));
      const productsSnapshot = await getDocs(currentStockQuery);
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const lowStockItems = [];
      const productMovements = {};

      // Calculate movements per product
      movements.forEach(movement => {
        const productId = movement.productId;
        productMovements[productId] = (productMovements[productId] || 0) + Math.abs(movement.quantityMoved || 0);
      });

      // Check for low stock items (this would need current stock calculation)
      for (const product of products.slice(0, 10)) { // Limit to avoid performance issues
        const threshold = product.stockThreshold || 10;
        const currentStock = product.currentStock || 0;
        
        if (currentStock <= threshold) {
          lowStockItems.push({
            name: product.name,
            stock: currentStock,
            threshold
          });
        }
      }

      const topMovements = Object.entries(productMovements)
        .map(([productId, movement]) => {
          const product = products.find(p => p.id === productId);
          return { product: product?.name || 'Produit inconnu', movement };
        })
        .sort((a, b) => b.movement - a.movement)
        .slice(0, 5);

      return {
        movements: movementsCount,
        lowStockItems: lowStockItems.slice(0, 5),
        topMovements
      };
    } catch (error) {
      console.error('Error getting inventory stats:', error);
      return { movements: 0, lowStockItems: [], topMovements: [] };
    }
  }

  // Get costs statistics
  private async getCostsStats(startDate: Timestamp, endDate: Timestamp) {
    try {
      const costsQuery = query(
        collection(db, 'costs'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const costsSnapshot = await getDocs(costsQuery);
      const costs = costsSnapshot.docs.map(doc => doc.data());

      const total = costs.reduce((sum, cost) => sum + (cost.amount || 0), 0);

      // Top categories
      const categoryAmounts = {};
      costs.forEach(cost => {
        const type = cost.expenseTypeName || 'Inconnu';
        categoryAmounts[type] = (categoryAmounts[type] || 0) + (cost.amount || 0);
      });

      const topCategories = Object.entries(categoryAmounts)
        .map(([type, amount]) => ({ type, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Budget status (would need expense types with budgets)
      const expenseTypesQuery = query(collection(db, 'expenseTypes'));
      const expenseTypesSnapshot = await getDocs(expenseTypesQuery);
      const expenseTypes = expenseTypesSnapshot.docs.map(doc => doc.data());

      const budgetStatus = expenseTypes
        .filter(type => type.budget > 0)
        .map(type => {
          const spent = categoryAmounts[type.name] || 0;
          const budget = type.budget || 0;
          const percentage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
          
          return {
            type: type.name,
            spent,
            budget,
            percentage
          };
        })
        .slice(0, 5);

      return {
        total,
        topCategories,
        budgetStatus
      };
    } catch (error) {
      console.error('Error getting costs stats:', error);
      return { total: 0, topCategories: [], budgetStatus: [] };
    }
  }

  // Get user statistics
  private async getUserStats(startDate: Timestamp, endDate: Timestamp) {
    try {
      // Get all users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Count new users in the week
      const newUsers = users.filter(user => {
        const createdAt = user.createdAt;
        return createdAt && createdAt.seconds >= startDate.seconds && createdAt.seconds <= endDate.seconds;
      }).length;

      // Get user activities for the week
      const activitiesQuery = query(
        collection(db, 'userActivities'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activities = activitiesSnapshot.docs.map(doc => doc.data());

      // Count logins
      const logins = activities.filter(activity => activity.action === 'login');
      const totalLogins = logins.length;

      // Count active users (users who performed any action)
      const activeUserIds = new Set(activities.map(activity => activity.userId));
      const activeUsers = activeUserIds.size;

      // Top active users
      const userLoginCounts = {};
      logins.forEach(login => {
        const userId = login.userId;
        userLoginCounts[userId] = (userLoginCounts[userId] || 0) + 1;
      });

      const topActiveUsers = Object.entries(userLoginCounts)
        .map(([userId, logins]) => {
          const user = users.find(u => u.uid === userId);
          return { 
            name: user?.displayName || user?.email || 'Utilisateur inconnu', 
            logins 
          };
        })
        .sort((a, b) => b.logins - a.logins)
        .slice(0, 5);

      return {
        activeUsers,
        newUsers,
        totalLogins,
        topActiveUsers
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { activeUsers: 0, newUsers: 0, totalLogins: 0, topActiveUsers: [] };
    }
  }

  // Send weekly reports to all eligible users
  async sendWeeklyReports(): Promise<void> {
    try {
      console.log('Starting weekly report generation...');

      // Calculate date range for the previous week
      const now = new Date();
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - now.getDay() - 6); // Previous Monday
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6); // Previous Sunday
      lastSunday.setHours(23, 59, 59, 999);

      // Generate weekly stats
      const stats = await this.generateWeeklyStats(lastMonday, lastSunday);

      // Get all active users who want weekly reports
      const usersQuery = query(
        collection(db, 'users'),
        where('active', '==', true)
      );

      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => doc.data());

      // Send reports to eligible users
      const reportPromises = users.map(async (user) => {
        try {
          // Check if user wants weekly reports
          const preferences = await notificationService.getUserNotificationPreferences(user.uid);
          if (!preferences?.weeklyReports) {
            return;
          }

          // Send weekly report notification with email
          await notificationService.createWeeklyReportNotification(
            user.uid,
            lastMonday.toLocaleDateString('fr-FR'),
            lastSunday.toLocaleDateString('fr-FR'),
            stats
          );

          console.log(`Weekly report sent to ${user.email}`);
        } catch (error) {
          console.error(`Error sending weekly report to ${user.email}:`, error);
        }
      });

      await Promise.all(reportPromises);
      console.log('Weekly reports sent successfully');
    } catch (error) {
      console.error('Error sending weekly reports:', error);
    }
  }

  // Manual report generation for testing
  async generateTestReport(userId: string): Promise<WeeklyStats | null> {
    try {
      // Generate report for the current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      endOfWeek.setHours(23, 59, 59, 999);

      const stats = await this.generateWeeklyStats(startOfWeek, endOfWeek);

      // Send test notification
      await notificationService.createWeeklyReportNotification(
        userId,
        startOfWeek.toLocaleDateString('fr-FR'),
        endOfWeek.toLocaleDateString('fr-FR'),
        stats
      );

      return stats;
    } catch (error) {
      console.error('Error generating test report:', error);
      return null;
    }
  }

  // Format stats for display
  formatStatsForDisplay(stats: WeeklyStats): string {
    return `
📊 RAPPORT HEBDOMADAIRE

📈 PRODUCTION:
- Total: ${stats.production.total} productions
- Complétées: ${stats.production.completed}
- En attente: ${stats.production.pending}
- Annulées: ${stats.production.cancelled}

💰 VENTES:
- Total: ${stats.sales.total} ventes
- Chiffre d'affaires: ${stats.sales.revenue.toLocaleString('fr-FR')} USD

📦 INVENTAIRE:
- Mouvements: ${stats.inventory.movements}
- Articles en stock faible: ${stats.inventory.lowStockItems.length}

💸 COÛTS:
- Total dépensé: ${stats.costs.total.toLocaleString('fr-FR')} USD

👥 UTILISATEURS:
- Utilisateurs actifs: ${stats.users.activeUsers}
- Nouveaux utilisateurs: ${stats.users.newUsers}
- Total connexions: ${stats.users.totalLogins}
    `.trim();
  }
}

export const reportService = new ReportService(); 