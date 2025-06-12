"use client";

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }) {
  const { user, loading, isAuthorized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;

    // If no user or not authorized, redirect to login
    if (!user || !isAuthorized) {
      // Store the intended destination
      if (typeof window !== 'undefined') {
        localStorage.setItem('redirectAfterLogin', pathname);
      }
      router.replace('/login');
      return;
    }
  }, [user, loading, isAuthorized, router, pathname]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fffafa]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user || !isAuthorized) {
    return null;
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
} 