import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Sale, Cost, Production, Inventory } from '@/types/index';

export async function fetchSales(): Promise<Sale[]> {
  const snapshot = await getDocs(collection(firestore, 'Sales'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
}

export async function fetchCosts(): Promise<Cost[]> {
  const snapshot = await getDocs(collection(firestore, 'Costs'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cost[];
}

export async function fetchProduction(): Promise<Production[]> {
  const snapshot = await getDocs(collection(firestore, 'Production'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Production[];
}

export async function fetchInventory(): Promise<Inventory[]> {
  const snapshot = await getDocs(collection(firestore, 'Inventory'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Inventory[];
} 