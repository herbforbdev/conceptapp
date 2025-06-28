import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, deleteDoc, doc, writeBatch, updateDoc, serverTimestamp, getDocs, addDoc, Timestamp } from 'firebase/firestore';
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
  async addInventoryMovementWithSource(data: Omit<InventoryEntry, 'id'> & { source: 'opening' | 'production' | 'consumption' | 'sales' | 'manual', relatedId?: string }): Promise<string> {
    const docRef = await addDoc(collection(firestore, 'Inventory'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: data.source,
      relatedId: data.relatedId || null
    });
    return docRef.id;
  },

  // Add opening stock entry (one-time setup per product)
  async addOpeningStock(data: {
    productId: string;
    productName: string;
    activityTypeId: string;
    activityTypeName: string;
    openingQuantity: number;
    date?: Date;
  }): Promise<string> {
    const openingData = {
      date: data.date ? Timestamp.fromDate(data.date) : Timestamp.fromDate(new Date()),
      movementType: 'OPENING' as const,
      initialQuantity: 0,
      quantityMoved: data.openingQuantity,
      remainingQuantity: data.openingQuantity,
      productId: data.productId,
      productName: data.productName,
      activityTypeId: data.activityTypeId,
      activityTypeName: data.activityTypeName,
      source: 'opening' as const
    };

    return this.addInventoryMovementWithSource(openingData);
  },

  // Check if a product already has opening stock
  async hasOpeningStock(productId: string): Promise<boolean> {
    const q = query(
      collection(firestore, 'Inventory'),
      where('productId', '==', productId),
      where('movementType', '==', 'OPENING')
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  },

  // Get opening stock entry for a product
  async getOpeningStock(productId: string): Promise<InventoryEntry | null> {
    const q = query(
      collection(firestore, 'Inventory'),
      where('productId', '==', productId),
      where('movementType', '==', 'OPENING'),
      orderBy('date', 'asc')
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as InventoryEntry;
  },

  // Add quick adjustment entry (daily reconciliation)
  async addQuickAdjustment(data: {
    productId: string;
    productName: string;
    activityTypeId: string;
    activityTypeName: string;
    adjustmentQuantity: number;
    reason?: string;
    date?: Date;
  }): Promise<string> {
    const adjustmentData = {
      date: data.date ? Timestamp.fromDate(data.date) : Timestamp.fromDate(new Date()),
      movementType: 'ADJUSTMENT' as const,
      initialQuantity: 0, // Not applicable for adjustments
      quantityMoved: data.adjustmentQuantity,
      remainingQuantity: data.adjustmentQuantity,
      productId: data.productId,
      productName: data.productName,
      activityTypeId: data.activityTypeId,
      activityTypeName: data.activityTypeName,
      source: 'manual' as const,
      reason: data.reason || 'Quick adjustment',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestore, 'Inventory'), adjustmentData);
    return docRef.id;
  },

  // Get adjustment history for a product
  async getAdjustmentHistory(productId: string): Promise<InventoryEntry[]> {
    const q = query(
      collection(firestore, 'Inventory'),
      where('productId', '==', productId),
      where('movementType', '==', 'ADJUSTMENT'),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InventoryEntry));
  }
}; 