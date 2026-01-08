import { firestore } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'ManualCashBookEntries';

/**
 * Add a manual cash book entry
 * @param {Object} entry - { date, description, type: 'CREDIT' | 'DEBIT', amountFC, amountUSD, currency }
 */
export async function addManualCashBookEntry(entry) {
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }
  
  const entryData = {
    date: entry.date instanceof Date 
      ? Timestamp.fromDate(entry.date) 
      : Timestamp.fromDate(new Date(entry.date)),
    description: entry.description || '',
    type: entry.type || 'DEBIT', // 'CREDIT' or 'DEBIT'
    amountFC: Number(entry.amountFC) || 0,
    amountUSD: Number(entry.amountUSD) || 0,
    currency: entry.currency || 'FC',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const entriesCollection = collection(firestore, COLLECTION_NAME);
  const docRef = await addDoc(entriesCollection, entryData);
  return docRef.id;
}

/**
 * Get all manual cash book entries
 */
export async function getManualCashBookEntries() {
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }
  
  const entriesCollection = collection(firestore, COLLECTION_NAME);
  const snapshot = await getDocs(entriesCollection);
  
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

/**
 * Update a manual cash book entry
 */
export async function updateManualCashBookEntry(id, updates) {
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }
  
  const entryRef = doc(firestore, COLLECTION_NAME, id);
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  
  // Convert date if provided
  if (updates.date) {
    updateData.date = updates.date instanceof Date 
      ? Timestamp.fromDate(updates.date) 
      : Timestamp.fromDate(new Date(updates.date));
  }
  
  await updateDoc(entryRef, updateData);
}

/**
 * Delete a manual cash book entry
 */
export async function deleteManualCashBookEntry(id) {
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }
  
  const entryRef = doc(firestore, COLLECTION_NAME, id);
  await deleteDoc(entryRef);
}

