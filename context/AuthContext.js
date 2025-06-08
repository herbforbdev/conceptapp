"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

// Export AuthContext as a named export
export const AuthContext = createContext({ user: null, loading: true, logout: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log("🔹 User Logged In:", currentUser);
        
        // Try to find user in Firestore by email
        try {
          const usersRef = collection(firestore, 'Users');
          const q = query(usersRef, where('email', '==', currentUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // Merge Firebase Auth user with Firestore user data
            const mergedUser = {
              ...currentUser,
              id: userDoc.id,
              role: userData.role || 'user',
              firestoreData: userData
            };
            
            console.log("✅ User found in Firestore:", mergedUser);
            setUser(mergedUser);
          } else {
            console.log("⚠️ User not found in Firestore, using Firebase Auth data only");
            setUser({ ...currentUser, role: 'user' });
          }
        } catch (error) {
          console.error("❌ Error fetching user from Firestore:", error);
          setUser({ ...currentUser, role: 'user' });
        }
      } else {
        console.log("❌ No User Logged In");
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      console.log("✅ Logout Successful");
      setUser(null);
      router.push("/login"); // Redirect to login page after logout
    } catch (error) {
      console.error("❌ Logout Failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
