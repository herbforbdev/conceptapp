import { firestore } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { Cost } from '@/types';

const costsCollection = collection(firestore, 'Costs');

export async function getCosts(): Promise<Cost[]> {
  const snapshot = await getDocs(costsCollection);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Cost));
}

export async function addCost(cost: Omit<Cost, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  await addDoc(costsCollection, {
    ...cost,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCost(id: string, updates: Partial<Cost>): Promise<void> {
  const ref = doc(firestore, 'Costs', id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCost(id: string): Promise<void> {
  const ref = doc(firestore, 'Costs', id);
  await deleteDoc(ref);
}

export async function batchDeleteCosts(ids: string[]): Promise<void> {
  const batch = writeBatch(firestore);
  ids.forEach(id => {
    const ref = doc(firestore, 'Costs', id);
    batch.delete(ref);
  });
  await batch.commit();
}

export async function batchUpdateCosts(
  ids: string[],
  updates: Partial<Cost>
): Promise<void> {
  const batch = writeBatch(firestore);
  ids.forEach(id => {
    const ref = doc(firestore, 'Costs', id);
    batch.update(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
} 