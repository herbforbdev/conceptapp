"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export function useFirestoreCollection(collectionName) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    const colRef = collection(firestore, collectionName);
    
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
        setError(err);
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
        setError(err);
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
    // Add helper properties
    isEmpty: !loading && Array.isArray(data) && data.length === 0,
    isLoaded: !loading && data !== null
  };
}