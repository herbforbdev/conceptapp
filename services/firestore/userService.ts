import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp, query, where, orderBy, Timestamp, increment, writeBatch, limit } from 'firebase/firestore';
import { User, AccessRequest } from '@/types/index';

export const userService = {
  // Get all users
  async getAllUsers(): Promise<User[]> {
    const querySnapshot = await getDocs(collection(firestore, 'Users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  // Add a new user (manual add)
  async addUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'Users'), {
      ...data,
      role: data.role || 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update a user
  async updateUser(id: string, data: Partial<User>): Promise<void> {
    const docRef = doc(firestore, 'Users', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a user
  async deleteUser(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'Users', id));
  },

  // Invite a user (adds user with default role 'user' and active: false)
  async inviteUser(email: string, displayName?: string, invitedBy?: string): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'Users'), {
      email,
      displayName: displayName || '',
      role: 'user',
      active: false,
      invited: true,
      invitedBy: invitedBy,
      invitedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Check if user is authorized (exists in Users collection and is active)
  async isUserAuthorized(email: string): Promise<{ authorized: boolean; user?: User }> {
    const usersRef = collection(firestore, 'Users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { authorized: false };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as User;
    const user = { ...userData, id: userDoc.id } as User;
    
    return { 
      authorized: userData.active === true, 
      user 
    };
  },

  // Access Request Management
  async createAccessRequest(email: string, displayName: string, message?: string): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'AccessRequests'), {
      email,
      displayName,
      message: message || '',
      status: 'pending',
      requestedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getAccessRequests(): Promise<AccessRequest[]> {
    const q = query(
      collection(firestore, 'AccessRequests'), 
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as AccessRequest));
  },

  async updateAccessRequest(id: string, status: 'approved' | 'rejected', reviewedBy: string): Promise<void> {
    const docRef = doc(firestore, 'AccessRequests', id);
    await updateDoc(docRef, {
      status,
      reviewedBy,
      reviewedAt: serverTimestamp(),
    });
  },

  async getPendingAccessRequests(): Promise<AccessRequest[]> {
    const q = query(
      collection(firestore, 'AccessRequests'), 
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as AccessRequest));
  },

    // Phase 3: Enhanced User Management Functions

  // Activity Tracking
  async logUserActivity(
    userId: string, 
    action: string, 
    details?: string, 
    performedBy?: string
  ): Promise<void> {
    try {
      const activity = {
        userId,
        action,
        timestamp: Timestamp.now(),
        ipAddress: await this.getClientIP(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ...(details && { details }),
        ...(performedBy && { performedBy })
      };
      
      await addDoc(collection(firestore, 'UserActivities'), activity);
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  },

  async getUserActivities(userId: string, limitCount = 50): Promise<any[]> {
    try {
      const q = query(
        collection(firestore, 'UserActivities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user activities:', error);
      return [];
    }
  },

  // Session Management
  async createUserSession(userId: string): Promise<{ sessionId: string; docId: string }> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session = {
        userId,
        sessionId,
        startTime: Timestamp.now(),
        lastActivity: Timestamp.now(),
        ipAddress: await this.getClientIP(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        isActive: true
      };
      
      const docRef = await addDoc(collection(firestore, 'UserSessions'), session);
      
      // Update user's last login
      await this.updateUser(userId, {
        lastLoginAt: Timestamp.now(),
        sessionId,
        totalLogins: increment(1) as any
      });
      
      // Log activity
      await this.logUserActivity(userId, 'login');
      
      return { sessionId, docId: docRef.id };
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  },

  async updateUserSession(sessionId: string): Promise<void> {
    try {
      const q = query(
        collection(firestore, 'UserSessions'),
        where('sessionId', '==', sessionId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        await updateDoc(sessionDoc.ref, {
          lastActivity: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error updating user session:', error);
    }
  },

  async endUserSession(sessionId: string, userId: string): Promise<void> {
    try {
      const q = query(
        collection(firestore, 'UserSessions'),
        where('sessionId', '==', sessionId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        await updateDoc(sessionDoc.ref, {
          endTime: Timestamp.now(),
          isActive: false
        });
      }
      
      // Update user's last active time
      await this.updateUser(userId, {
        lastActiveAt: Timestamp.now()
      });
      
      // Log activity
      await this.logUserActivity(userId, 'logout');
    } catch (error) {
      console.error('Error ending user session:', error);
    }
  },

  async getActiveSessions(userId?: string): Promise<any[]> {
    try {
      let q;
      if (userId) {
        q = query(
          collection(firestore, 'UserSessions'),
          where('userId', '==', userId),
          where('isActive', '==', true),
          orderBy('lastActivity', 'desc')
        );
      } else {
        q = query(
          collection(firestore, 'UserSessions'),
          where('isActive', '==', true),
          orderBy('lastActivity', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  },

  // Enhanced Profile Management
  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<boolean> {
    try {
      const updateData = {
        ...profileData,
        updatedAt: Timestamp.now()
      };
      
      await this.updateUser(userId, updateData);
      
      // Log activity
      await this.logUserActivity(userId, 'profile_update', `Updated fields: ${Object.keys(profileData).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(firestore, 'Users', userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Bulk Operations
  async bulkUpdateUsers(userIds: string[], updateData: Partial<User>, performedBy: string): Promise<boolean> {
    try {
      const batch = writeBatch(firestore);
      
      for (const userId of userIds) {
        const userRef = doc(firestore, 'Users', userId);
        batch.update(userRef, {
          ...updateData,
          updatedAt: Timestamp.now()
        });
      }
      
      await batch.commit();
      
      // Log activities
      for (const userId of userIds) {
        await this.logUserActivity(
          userId, 
          'bulk_update', 
          `Updated fields: ${Object.keys(updateData).join(', ')}`,
          performedBy
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error bulk updating users:', error);
      throw error;
    }
  },

  async exportUsers(): Promise<any[]> {
    try {
      const users = await this.getAllUsers();
      const exportData = users.map(user => ({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt?.toDate?.() || '',
        lastLoginAt: user.lastLoginAt?.toDate?.() || '',
        totalLogins: user.totalLogins || 0,
        company: user.company || '',
        department: user.department || '',
        location: user.location || ''
      }));
      
      return exportData;
    } catch (error) {
      console.error('Error exporting users:', error);
      throw error;
    }
  },

  // Search and Filter
  async searchUsers(searchTerm: string, filters: {
    role?: string;
    active?: boolean;
    company?: string;
    department?: string;
  } = {}): Promise<User[]> {
    try {
      const baseCollection = collection(firestore, 'Users');
      const constraints = [];
      
      // Apply filters
      if (filters.role) {
        constraints.push(where('role', '==', filters.role));
      }
      if (filters.active !== undefined) {
        constraints.push(where('active', '==', filters.active));
      }
      if (filters.company) {
        constraints.push(where('company', '==', filters.company));
      }
      if (filters.department) {
        constraints.push(where('department', '==', filters.department));
      }
      
      const q = constraints.length > 0 ? query(baseCollection, ...constraints) : baseCollection;
      
      const snapshot = await getDocs(q);
      let users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      // Client-side search for name/email if searchTerm provided
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        users = users.filter(user => 
          user.email.toLowerCase().includes(term) ||
          user.displayName?.toLowerCase().includes(term) ||
          user.company?.toLowerCase().includes(term) ||
          user.department?.toLowerCase().includes(term)
        );
      }
      
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  // Utilities
  async getClientIP(): Promise<string> {
    try {
      // In a real app, you'd get this from a server endpoint
      // For now, return a placeholder
      return 'Client IP';
    } catch {
      return 'Unknown';
    }
  },
}; 