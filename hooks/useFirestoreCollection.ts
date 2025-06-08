import { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  getDocs, 
  DocumentData, 
  QueryDocumentSnapshot,
  CollectionReference
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";

interface FirestoreCollectionResult<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  isEmpty: boolean;
  isLoaded: boolean;
}

type WithId<T> = T & { id: string };

export function useFirestoreCollection<T extends DocumentData>(
  collectionName: string
): FirestoreCollectionResult<WithId<T>> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    const colRef = collection(firestore, collectionName) as CollectionReference<T>;
    
    console.log(`Setting up listener for ${collectionName} collection`);
    
    // Initial fetch using getDocs
    getDocs(colRef)
      .then((snapshot) => {
        if (!isMounted) return;
        
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Initial fetch: Received ${docs.length} documents from ${collectionName}`);
        if (docs.length > 0) {
          console.log(`Sample document from ${collectionName}:`, docs[0]);
        }
        
        setData(docs);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error(`Error in initial fetch of ${collectionName}:`, err);
        setError(err as Error);
        setLoading(false);
      });
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (!isMounted) return;
        
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Real-time update: Received ${docs.length} documents from ${collectionName}`);
        if (docs.length > 0) {
          console.log(`Sample document from ${collectionName}:`, docs[0]);
        }
        
        setData(docs);
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error(`Error in real-time updates for ${collectionName}:`, err);
        setError(err as Error);
        setLoading(false);
      }
    );
    
    return () => {
      console.log(`Cleaning up ${collectionName} listener`);
      isMounted = false;
      unsubscribe();
    };
  }, [collectionName]);

  return { 
    data, 
    loading, 
    error,
    isEmpty: !loading && Array.isArray(data) && data.length === 0,
    isLoaded: !loading && data !== null
  };
} 