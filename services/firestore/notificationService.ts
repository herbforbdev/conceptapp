import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export interface Notification {
  id: string;
  type: 'access_request' | 'user_invited' | 'user_activated' | 'user_deactivated' | 'inventory_alert' | 'cost_alert' | 'budget_alert';
  title: string;
  message: string;
  link?: string;
  data?: any;
  isRead: boolean;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
}

export const notificationService = {
  // Create notification
  async createNotification(
    type: Notification['type'],
    title: string,
    message: string,
    userId: string,
    link?: string,
    data?: any
  ): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'notifications'), {
      type,
      title,
      message,
      link: link || '',
      data: data || {},
      isRead: false,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Get notifications for user
  async getNotifications(userId: string): Promise<Notification[]> {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  },

  // Get unread notifications count
  async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const docRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  },

  // Mark all notifications as read for user
  async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const querySnapshot = await getDocs(q);
    
    const updatePromises = querySnapshot.docs.map(docSnapshot => 
      updateDoc(doc(firestore, 'notifications', docSnapshot.id), {
        isRead: true,
        updatedAt: serverTimestamp(),
      })
    );
    
    await Promise.all(updatePromises);
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(
    userId: string, 
    callback: (notifications: Notification[]) => void
  ): () => void {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    });
  },

  // Helper functions for specific notification types
  async notifyAdminsOfAccessRequest(
    requesterEmail: string,
    requesterName: string,
    adminIds: string[]
  ): Promise<void> {
    const promises = adminIds.map(adminId =>
      this.createNotification(
        'access_request',
        'Nouvelle demande d\'accès',
        `${requesterName} (${requesterEmail}) a demandé l'accès à l'application.`,
        adminId,
        '/dashboard/settings/users',
        { requesterEmail, requesterName }
      )
    );
    await Promise.all(promises);
  },

  async notifyOfUserInvitation(
    invitedEmail: string,
    invitedName: string,
    invitedBy: string,
    adminIds: string[]
  ): Promise<void> {
    const promises = adminIds.map(adminId =>
      this.createNotification(
        'user_invited',
        'Utilisateur invité',
        `${invitedName} (${invitedEmail}) a été invité à rejoindre l'application.`,
        adminId,
        '/dashboard/settings/users',
        { invitedEmail, invitedName, invitedBy }
      )
    );
    await Promise.all(promises);
  },

  async notifyOfUserStatusChange(
    userEmail: string,
    userName: string,
    newStatus: 'activated' | 'deactivated',
    changedBy: string,
    adminIds: string[]
  ): Promise<void> {
    const type = newStatus === 'activated' ? 'user_activated' : 'user_deactivated';
    const title = newStatus === 'activated' ? 'Utilisateur activé' : 'Utilisateur désactivé';
    const message = `${userName} (${userEmail}) a été ${newStatus === 'activated' ? 'activé' : 'désactivé'}.`;
    
    const promises = adminIds.map(adminId =>
      this.createNotification(
        type,
        title,
        message,
        adminId,
        '/dashboard/settings/users',
        { userEmail, userName, changedBy }
      )
    );
    await Promise.all(promises);
  }
}; 