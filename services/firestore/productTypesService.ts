import { firestore } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

export interface ProductType {
  id?: string;
  name: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION = 'ProductTypes';

export async function getProductTypes(): Promise<ProductType[]> {
  const snapshot = await getDocs(collection(firestore, COLLECTION));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductType));
}

export async function addProductType(data: Omit<ProductType, 'id'>): Promise<ProductType> {
  const docRef = await addDoc(collection(firestore, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id: docRef.id, ...data };
}

export async function updateProductType(id: string, data: Partial<ProductType>): Promise<void> {
  await updateDoc(doc(firestore, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteProductType(id: string): Promise<void> {
  await deleteDoc(doc(firestore, COLLECTION, id));
} 