import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { User } from '@/types/index';

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
  async inviteUser(email: string, displayName?: string): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'Users'), {
      email,
      displayName: displayName || '',
      role: 'user',
      active: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },
}; 