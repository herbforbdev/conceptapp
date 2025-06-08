import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
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
}; 