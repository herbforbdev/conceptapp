import { firestore } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { GlAccount } from '@/types/accounts';
import { SYSCOHADA_CLASS_6 } from '@/lib/accounting/syscohadaClass6';
import {
  buildGlAccountRecords,
  getAccountClass,
  getParentCode
} from '@/lib/accounting/accountHelpers';

const COLLECTION = 'GlAccounts';

const getDb = () => {
  if (!firestore) throw new Error('Firestore not initialized');
  return firestore;
};

const getCollection = () => collection(getDb(), COLLECTION);

export const seedClass6AccountsIfEmpty = async (): Promise<number> => {
  const db = getDb();
  const snapshot = await getDocs(getCollection());
  if (!snapshot.empty) return 0;

  const records = buildGlAccountRecords(SYSCOHADA_CLASS_6);
  const batch = writeBatch(db);
  records.forEach(record => {
    const ref = doc(db, COLLECTION, record.code);
    batch.set(ref, {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
  return records.length;
};

export const addGlAccount = async (code: string, name: string): Promise<void> => {
  const trimmedCode = code.trim();
  const trimmedName = name.trim();
  if (!trimmedCode || !trimmedName) {
    throw new Error('Code and name are required');
  }

  const existing = await getDocs(getCollection());
  const alreadyExists = existing.docs.some(d => d.id === trimmedCode || d.data().code === trimmedCode);
  if (alreadyExists) {
    throw new Error('An account with this code already exists');
  }

  const parentCode = getParentCode(trimmedCode);
  const hasChildren = existing.docs.some(d => {
    const childCode = d.data().code || d.id;
    return getParentCode(childCode) === trimmedCode;
  });

  await setDoc(doc(getDb(), COLLECTION, trimmedCode), {
    code: trimmedCode,
    name: trimmedName,
    class: getAccountClass(trimmedCode),
    parentCode,
    isPostable: !hasChildren,
    isActive: true,
    isDefaultSalesAccount: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  if (parentCode) {
    const parentSnap = existing.docs.find(d => d.id === parentCode || d.data().code === parentCode);
    if (parentSnap && parentSnap.data().isPostable) {
      await updateDoc(parentSnap.ref, {
        isPostable: false,
        updatedAt: serverTimestamp()
      });
    }
  }
};

export const updateGlAccount = async (
  id: string,
  updates: Partial<Pick<GlAccount, 'name' | 'isActive'>>
): Promise<void> => {
  await updateDoc(doc(getDb(), COLLECTION, id), {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const setDefaultSalesAccount = async (id: string): Promise<void> => {
  const snapshot = await getDocs(getCollection());
  const target = snapshot.docs.find(d => d.id === id);
  if (!target) throw new Error('Account not found');

  const data = target.data();
  if (data.class !== '7') {
    throw new Error('Default sales account must be class 7');
  }
  if (!data.isPostable) {
    throw new Error('Default sales account must be a lowest-level account');
  }

  const batch = writeBatch(getDb());
  snapshot.docs.forEach(accountDoc => {
    const isTarget = accountDoc.id === id;
    const currentlyDefault = Boolean(accountDoc.data().isDefaultSalesAccount);
    if (isTarget || currentlyDefault) {
      batch.update(accountDoc.ref, {
        isDefaultSalesAccount: isTarget,
        updatedAt: serverTimestamp()
      });
    }
  });
  await batch.commit();
};

export const clearDefaultSalesAccount = async (id: string): Promise<void> => {
  await updateDoc(doc(getDb(), COLLECTION, id), {
    isDefaultSalesAccount: false,
    updatedAt: serverTimestamp()
  });
};

export const deleteGlAccount = async (id: string): Promise<void> => {
  const snapshot = await getDocs(getCollection());
  const target = snapshot.docs.find(d => d.id === id);
  if (!target) return;

  const code = target.data().code || id;
  const hasChildren = snapshot.docs.some(d => getParentCode(d.data().code || d.id) === code);
  if (hasChildren) {
    throw new Error('Cannot delete an account that has children');
  }

  await deleteDoc(doc(getDb(), COLLECTION, id));

  const parentCode = getParentCode(code);
  if (parentCode) {
    const siblings = snapshot.docs.filter(d => {
      const childCode = d.data().code || d.id;
      return d.id !== id && getParentCode(childCode) === parentCode;
    });
    if (siblings.length === 0) {
      const parent = snapshot.docs.find(d => d.id === parentCode || d.data().code === parentCode);
      if (parent) {
        await updateDoc(parent.ref, {
          isPostable: true,
          updatedAt: serverTimestamp()
        });
      }
    }
  }
};
