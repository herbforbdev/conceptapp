"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, firestore } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { userService } from "@/services/firestore/userService";
import { useRouter } from "next/navigation";

// Export AuthContext as a named export
export const AuthContext = createContext({ 
  user: null, 
  loading: true, 
  logout: () => {},
  authError: null,
  isAuthorized: false 
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError(null);
      
      if (currentUser) {
        console.log("🔹 User Logged In:", currentUser);
        
        // Check if user is authorized to access the app
        try {
          const { authorized, user: firestoreUser } = await userService.isUserAuthorized(currentUser.email);
          
          if (authorized && firestoreUser) {
            // User is authorized and active
            const mergedUser = {
              ...currentUser,
              id: firestoreUser.id,
              role: firestoreUser.role || 'user',
              active: firestoreUser.active,
              invited: firestoreUser.invited,
              firestoreData: firestoreUser
            };
            
            console.log("✅ User authorized and active:", mergedUser);
            setUser(mergedUser);
            setIsAuthorized(true);
          } else if (firestoreUser && !firestoreUser.active) {
            // User exists but is not active
            console.log("⚠️ User account is disabled");
            setAuthError({
              type: 'ACCOUNT_DISABLED',
              message: 'Votre compte a été désactivé. Contactez un administrateur.'
            });
            setUser(null);
            setIsAuthorized(false);
          } else {
            // User not found in Firestore - not invited/authorized
            console.log("⚠️ User not authorized - not found in system");
            setAuthError({
              type: 'NOT_AUTHORIZED',
              message: 'Vous n\'êtes pas autorisé à accéder à cette application. Demandez l\'accès à un administrateur.'
            });
            setUser(null);
            setIsAuthorized(false);
          }
        } catch (error) {
          console.error("❌ Error checking user authorization:", error);
          setAuthError({
            type: 'ERROR',
            message: 'Erreur lors de la vérification de votre autorisation.'
          });
          setUser(null);
          setIsAuthorized(false);
        }
      } else {
        console.log("❌ No User Logged In");
        setUser(null);
        setIsAuthorized(false);
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
    <AuthContext.Provider value={{ user, loading, logout, authError, isAuthorized }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
