import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, deleteDoc, doc, writeBatch, updateDoc, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { InventoryEntry } from '@/types/inventory';

export const inventoryService = {
  // Get all inventory movements
  async getAllMovements(): Promise<InventoryEntry[]> {
    const querySnapshot = await getDocs(collection(firestore, 'Inventory'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryEntry));
  },

  // Delete a single inventory movement
  async deleteMovement(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'Inventory', id));
  },

  // Bulk delete inventory movements
  async bulkDeleteMovements(ids: string[]): Promise<void> {
    const batch = writeBatch(firestore);
    ids.forEach(id => {
      const docRef = doc(firestore, 'Inventory', id);
      batch.delete(docRef);
    });
    await batch.commit();
  },

  // Update an inventory movement
  async updateMovement(id: string, data: Partial<InventoryEntry>): Promise<void> {
    const docRef = doc(firestore, 'Inventory', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // Add a new inventory movement
  async addMovement(data: Omit<InventoryEntry, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'Inventory'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // Get movements by date range
  async getMovementsByDateRange(startDate: Date, endDate: Date): Promise<InventoryEntry[]> {
    const q = query(
      collection(firestore, 'Inventory'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryEntry));
  },

  // Get movements by product
  async getMovementsByProduct(productId: string): Promise<InventoryEntry[]> {
    const q = query(
      collection(firestore, 'Inventory'),
      where('productId', '==', productId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryEntry));
  },

  // Add a new inventory movement with source and relatedId
  async addInventoryMovementWithSource(data: Omit<InventoryEntry, 'id'> & { source: 'production' | 'consumption' | 'sales' | 'manual', relatedId?: string }): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'Inventory'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: data.source,
      relatedId: data.relatedId || null
    });
    return docRef.id;
  }
}; 