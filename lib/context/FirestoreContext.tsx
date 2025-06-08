import { createContext, useContext, ReactNode } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Product {
  id: string;
  productid: string;
  producttype: string;
  description: string;
  activitytypeid: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface ActivityType {
  id: string;
  activityid: string;
  name: string;
  description: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface ExpenseType {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface FirestoreContextType {
  products: Product[];
  activityTypes: ActivityType[];
  expenseTypes: ExpenseType[];
  loading: boolean;
  error: FirestoreError | null;
}

const FirestoreContext = createContext<FirestoreContextType | null>(null);

export function FirestoreProvider({ children }: { children: ReactNode }) {
  const [productsSnapshot, productsLoading, productsError] = useCollection(
    query(collection(db, 'products'), orderBy('productid'))
  );

  const [activityTypesSnapshot, activityTypesLoading, activityTypesError] = useCollection(
    query(collection(db, 'activitytypes'), orderBy('activityid'))
  );

  const [expenseTypesSnapshot, expenseTypesLoading, expenseTypesError] = useCollection(
    query(collection(db, 'expensetypes'), orderBy('name'))
  );

  const products = productsSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Product[] || [];

  const activityTypes = activityTypesSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ActivityType[] || [];

  const expenseTypes = expenseTypesSnapshot?.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ExpenseType[] || [];

  const loading = productsLoading || activityTypesLoading || expenseTypesLoading;
  const error = productsError || activityTypesError || expenseTypesError || null;

  return (
    <FirestoreContext.Provider value={{
      products,
      activityTypes,
      expenseTypes,
      loading,
      error
    }}>
      {children}
    </FirestoreContext.Provider>
  );
}

export function useFirestore() {
  const context = useContext(FirestoreContext);
  if (!context) {
    throw new Error('useFirestore must be used within a FirestoreProvider');
  }
  return context;
} 