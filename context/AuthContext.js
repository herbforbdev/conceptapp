"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, firestore, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signOut, signInWithPopup } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { userService } from "@/services/firestore/userService";
import { useRouter } from "next/navigation";

// Export AuthContext as a named export
export const AuthContext = createContext({ 
  user: null, 
  loading: true, 
  logout: () => {},
  authError: null,
  isAuthorized: false,
  sessionId: null,
  userActivities: [],
  loginWithGoogle: () => {},
  updateUserProfile: () => {},
  loadUserActivities: () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Only set up auth listener on client side when auth is available
    if (!auth) {
      setLoading(false);
      return;
    }
    
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
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Phase 3: Enhanced login with session tracking
  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      setAuthError('Authentication service not available.');
      return;
    }
    
    try {
      setLoading(true);
      setAuthError(null);
      
      const result = await signInWithPopup(auth, googleProvider);
      const authUser = result.user;
      
      // Check authorization first
      const authCheck = await userService.isUserAuthorized(authUser.email);
      
      if (!authCheck.authorized) {
        await auth.signOut();
        if (authCheck.user && !authCheck.user.active) {
          setAuthError('Votre compte a été désactivé. Contactez un administrateur.');
        } else {
          setAuthError('Vous n\'êtes pas autorisé à accéder à cette application. Vous pouvez demander l\'accès en cliquant sur le lien ci-dessous.');
        }
        setIsAuthorized(false);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // User is authorized, proceed with login
      setIsAuthorized(true);
      setUser(authCheck.user);
      
      // Phase 3: Create user session and track activity
      try {
        const session = await userService.createUserSession(authCheck.user.id);
        setSessionId(session.sessionId);
        
        // Store session in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('userSessionId', session.sessionId);
        }
      } catch (sessionError) {
        console.error('Error creating user session:', sessionError);
        // Don't fail login if session creation fails
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setAuthError('Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Phase 3: Enhanced logout with session cleanup
  const logout = async () => {
    if (!auth) {
      return;
    }
    
    try {
      setLoading(true);
      
      // End user session if exists
      if (sessionId && user?.id) {
        try {
          await userService.endUserSession(sessionId, user.id);
        } catch (error) {
          console.error('Error ending user session:', error);
        }
      }
      
      // Clear session from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userSessionId');
      }
      
      await auth.signOut();
      setUser(null);
      setIsAuthorized(false);
      setSessionId(null);
      setUserActivities([]);
      setAuthError(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Phase 3: Session activity tracking
  useEffect(() => {
    let activityInterval;
    
    if (sessionId && user?.id) {
      // Update session activity every 5 minutes
      activityInterval = setInterval(async () => {
        try {
          await userService.updateUserSession(sessionId);
        } catch (error) {
          console.error('Error updating session activity:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (activityInterval) {
        clearInterval(activityInterval);
      }
    };
  }, [sessionId, user?.id]);

  // Phase 3: Load user activities
  const loadUserActivities = async () => {
    if (!user?.id) return;
    
    try {
      const activities = await userService.getUserActivities(user.id, 20);
      setUserActivities(activities);
    } catch (error) {
      console.error('Error loading user activities:', error);
    }
  };

  // Phase 3: Enhanced user profile update
  const updateUserProfile = async (profileData) => {
    if (!user?.id) return false;
    
    try {
      await userService.updateUserProfile(user.id, profileData);
      
      // Update local user state
      setUser(prev => ({ ...prev, ...profileData }));
      
      // Reload activities to show the update
      await loadUserActivities();
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  };

  // Phase 3: Check for existing session on app load
  useEffect(() => {
    if (user?.id && typeof window !== 'undefined') {
      const savedSessionId = localStorage.getItem('userSessionId');
      if (savedSessionId && !sessionId) {
        setSessionId(savedSessionId);
        // Update session to mark as active
        userService.updateUserSession(savedSessionId).catch(console.error);
      }
      
      // Load user activities
      loadUserActivities();
    }
  }, [user?.id]);

  const value = {
    user,
    loading,
    authError,
    isAuthorized,
    sessionId,
    userActivities,
    loginWithGoogle,
    logout,
    updateUserProfile,
    loadUserActivities
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
