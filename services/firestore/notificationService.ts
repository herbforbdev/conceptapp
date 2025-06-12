import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot, Timestamp, writeBatch } from 'firebase/firestore';
// // import { emailService } from '../emailService'; // Server-only // Moved to dynamic import to prevent client-side issues

export interface Notification {
  id?: string;
  recipientId: string;
  type: 'inventory_alert' | 'budget_overrun' | 'user_invite' | 'access_request' | 'system' | 'weekly_report';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  emailSent?: boolean;
  emailSentAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  inventoryAlerts: boolean;
  budgetAlerts: boolean;
  userManagementAlerts: boolean;
  systemAlerts: boolean;
  updatedAt: Timestamp;
}

class NotificationService {
  private collectionName = 'notifications';
  private preferencesCollectionName = 'notificationPreferences';

  // Create notification with optional email sending
  async createNotification(
    recipientId: string, 
    type: Notification['type'], 
    title: string, 
    message: string, 
    data?: any,
    sendEmail: boolean = true
  ): Promise<string | null> {
    try {
      const notification: Omit<Notification, 'id'> = {
        recipientId,
        type,
        title,
        message,
        data,
        read: false,
        emailSent: false,
        createdAt: serverTimestamp() as Timestamp,
      };

      const docRef = await addDoc(collection(firestore, this.collectionName), notification);

      // Send email if enabled and user preferences allow it
      if (sendEmail) {
        await this.sendEmailNotification(docRef.id, recipientId, type, title, message, data);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  // Send email notification based on type
  private async sendEmailNotification(
    notificationId: string,
    recipientId: string, 
    type: Notification['type'], 
    title: string, 
    message: string, 
    data?: any
  ): Promise<void> {
    try {
      // Check user's email preferences
      const preferences = await this.getUserNotificationPreferences(recipientId);
      if (!preferences?.emailNotifications) {
        return; // User has disabled email notifications
      }

      // Check specific notification type preferences
      const typeEnabled = this.isNotificationTypeEnabled(type, preferences);
      if (!typeEnabled) {
        return;
      }

      // Get user information for email
      const userDoc = await getDocs(query(
        collection(firestore, 'users'), 
        where('uid', '==', recipientId),
        limit(1)
      ));

      if (userDoc.empty) return;

      const user = userDoc.docs[0].data();
      const userEmail = user.email;
      const userName = user.displayName || user.email;

      let emailSent = false;

      // Send appropriate email based on notification type
      switch (type) {
        case 'inventory_alert':
          if (data?.productName && data?.currentStock && data?.threshold) {
            emailSent = await emailService.sendLowStockAlert(
              userEmail, 
              userName, 
              data.productName, 
              data.currentStock, 
              data.threshold
            );
          }
          break;

        case 'budget_overrun':
          if (data?.expenseType && data?.currentAmount && data?.budgetAmount) {
            emailSent = await emailService.sendBudgetOverrunAlert(
              userEmail, 
              userName, 
              data.expenseType, 
              data.currentAmount, 
              data.budgetAmount,
              data.period || 'Ce mois'
            );
          }
          break;

        case 'user_invite':
          if (data?.inviterName && data?.companyName) {
            emailSent = await emailService.sendUserInvitation(
              userEmail, 
              userName, 
              data.inviterName, 
              data.companyName
            );
          }
          break;

        case 'access_request':
          if (data?.action === 'approved' && data?.companyName) {
            emailSent = await emailService.sendAccessRequestApproved(
              userEmail, 
              userName, 
              data.companyName
            );
          } else if (data?.action === 'rejected' && data?.companyName) {
            emailSent = await emailService.sendAccessRequestRejected(
              userEmail, 
              userName, 
              data.companyName, 
              data.reason
            );
          }
          break;

        case 'weekly_report':
          if (data?.weekStart && data?.weekEnd && data?.stats) {
            emailSent = await emailService.sendWeeklyReport(
              userEmail, 
              userName, 
              data.weekStart, 
              data.weekEnd, 
              data.stats
            );
          }
          break;

        default:
          // For system notifications, we could send a generic email
          console.log(`Email not implemented for notification type: ${type}`);
          break;
      }

      // Update notification with email status
      if (emailSent) {
        await updateDoc(doc(firestore, this.collectionName, notificationId), {
          emailSent: true,
          emailSentAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Check if notification type is enabled in user preferences
  private isNotificationTypeEnabled(type: Notification['type'], preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'inventory_alert':
        return preferences.inventoryAlerts;
      case 'budget_overrun':
        return preferences.budgetAlerts;
      case 'user_invite':
      case 'access_request':
        return preferences.userManagementAlerts;
      case 'weekly_report':
        return preferences.weeklyReports;
      case 'system':
        return preferences.systemAlerts;
      default:
        return true;
    }
  }

  // Get user's notification preferences
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const prefsQuery = query(
        collection(firestore, this.preferencesCollectionName),
        where('userId', '==', userId),
        limit(1)
      );

      const snapshot = await getDocs(prefsQuery);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as NotificationPreferences;
      }

      // Return default preferences if none exist
      return {
        userId,
        emailNotifications: true,
        pushNotifications: true,
        weeklyReports: true,
        inventoryAlerts: true,
        budgetAlerts: true,
        userManagementAlerts: true,
        systemAlerts: true,
        updatedAt: serverTimestamp() as Timestamp
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  // Update user's notification preferences
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const existingPrefs = await this.getUserNotificationPreferences(userId);
      
      if (existingPrefs && existingPrefs.id) {
        // Update existing preferences
        await updateDoc(doc(firestore, this.preferencesCollectionName, existingPrefs.id), {
          ...preferences,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new preferences
        await addDoc(collection(firestore, this.preferencesCollectionName), {
          userId,
          ...preferences,
          updatedAt: serverTimestamp()
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  // Get notifications for a user
  async getUserNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await updateDoc(doc(firestore, this.collectionName, notificationId), {
        read: true,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(firestore);

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(firestore, this.collectionName),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Enhanced helper methods for specific notification types

  // Inventory alert
  async createInventoryAlert(recipientId: string, productName: string, currentStock: number, threshold: number): Promise<string | null> {
    return this.createNotification(
      recipientId,
      'inventory_alert',
      'Stock Faible Détecté',
      `Le stock de ${productName} est faible (${currentStock} unités restantes)`,
      { productName, currentStock, threshold }
    );
  }

  // Budget overrun alert
  async createBudgetAlert(recipientId: string, expenseType: string, currentAmount: number, budgetAmount: number, period: string = 'Ce mois'): Promise<string | null> {
    const overrun = currentAmount - budgetAmount;
    return this.createNotification(
      recipientId,
      'budget_overrun',
      'Dépassement Budgétaire',
      `Budget ${expenseType} dépassé de ${overrun.toLocaleString('fr-FR')} USD`,
      { expenseType, currentAmount, budgetAmount, period, overrun }
    );
  }

  // User invitation notification
  async createUserInviteNotification(recipientId: string, inviterName: string, companyName: string): Promise<string | null> {
    return this.createNotification(
      recipientId,
      'user_invite',
      'Invitation Reçue',
      `${inviterName} vous invite à rejoindre ${companyName}`,
      { inviterName, companyName }
    );
  }

  // Access request notification
  async createAccessRequestNotification(recipientId: string, action: 'approved' | 'rejected', companyName: string, reason?: string): Promise<string | null> {
    const title = action === 'approved' ? 'Demande Approuvée' : 'Demande Rejetée';
    const message = action === 'approved' 
      ? `Votre demande d'accès à ${companyName} a été approuvée`
      : `Votre demande d'accès à ${companyName} a été rejetée${reason ? ': ' + reason : ''}`;

    return this.createNotification(
      recipientId,
      'access_request',
      title,
      message,
      { action, companyName, reason }
    );
  }

  // Weekly report notification
  async createWeeklyReportNotification(recipientId: string, weekStart: string, weekEnd: string, stats: any): Promise<string | null> {
    return this.createNotification(
      recipientId,
      'weekly_report',
      'Rapport Hebdomadaire',
      `Votre rapport d'activité pour la semaine du ${weekStart}`,
      { weekStart, weekEnd, stats }
    );
  }

  // System notification
  async createSystemNotification(recipientId: string, title: string, message: string, data?: any): Promise<string | null> {
    return this.createNotification(
      recipientId,
      'system',
      title,
      message,
      data
    );
  }

  // Bulk notifications for admin alerts
  async createBulkAdminAlert(type: Notification['type'], title: string, message: string, data?: any): Promise<void> {
    try {
      // Get all admin users
      const adminQuery = query(
        collection(firestore, 'users'),
        where('role', '==', 'admin'),
        where('active', '==', true)
      );

      const adminSnapshot = await getDocs(adminQuery);
      const notifications = adminSnapshot.docs.map(doc => ({
        recipientId: doc.data().uid,
        type,
        title,
        message,
        data,
        read: false,
        emailSent: false,
        createdAt: serverTimestamp()
      }));

      // Batch create notifications
      const batch = writeBatch(firestore);
      notifications.forEach(notification => {
        const docRef = doc(collection(firestore, this.collectionName));
        batch.set(docRef, notification);
      });

      await batch.commit();

      // Send emails to admins (if preferences allow)
      for (const admin of adminSnapshot.docs) {
        const adminData = admin.data();
        if (adminData.uid) {
          // Email will be sent by the createNotification method called above
          await this.sendEmailNotification(
            '', // We don't have the notification ID for batch operations
            adminData.uid,
            type,
            title,
            message,
            data
          );
        }
      }

    } catch (error) {
      console.error('Error creating bulk admin alerts:', error);
    }
  }

  async notifyAdminsOfAccessRequest(
    userEmail: string,
    userName: string,
    adminIds: string[]
  ): Promise<void> {
    try {
      const title = 'Nouvelle demande d\'accès';
      const message = `${userName} (${userEmail}) a demandé l'accès à l'application.`;
      
      const batch = writeBatch(firestore);
      
      for (const adminId of adminIds) {
        const notification: Omit<Notification, 'id'> = {
          recipientId: adminId,
          type: 'access_request',
          title,
          message,
          data: { userEmail, userName },
          read: false,
          emailSent: false,
          createdAt: Timestamp.now(),
        };
        
        const notifRef = doc(collection(firestore, this.collectionName));
        batch.set(notifRef, notification);
      }
      
      await batch.commit();
      
      // Send emails to admins
      for (const adminId of adminIds) {
        await this.sendEmailNotification(
          '', // notification ID will be generated
          adminId,
          'access_request',
          title,
          message,
          { userEmail, userName }
        );
      }
    } catch (error) {
      console.error('Error notifying admins of access request:', error);
    }
  }
}

export const notificationService = new NotificationService(); 
