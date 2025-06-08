"use client";

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card } from 'flowbite-react';
import { HiExclamationCircle, HiHome } from 'react-icons/hi';

export default function AdminOnly({ children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    // Redirect non-admin users to dashboard after loading is complete
    if (!loading && user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <HiExclamationCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('common.accessDenied') || 'Access Denied'}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('common.adminRequired') || 'This section requires administrator privileges.'}
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <HiHome className="h-5 w-5" />
              {t('common.backToDashboard') || 'Back to Dashboard'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Render children for admin users
  return <>{children}</>;
} 