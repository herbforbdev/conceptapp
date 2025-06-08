"use client";

import { useState } from 'react';
import { Card, Button, Alert } from 'flowbite-react';
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/firestore/userService';
import { useLanguage } from '@/context/LanguageContext';

export default function SyncUserPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const syncUser = async () => {
    if (!user) return;

    setLoading(true);
    setResult(null);

    try {
      // Check if user already exists in Firestore
      const existingUsers = await userService.getAllUsers();
      const existingUser = existingUsers.find(u => u.email === user.email);

      if (existingUser) {
        setResult({
          type: 'info',
          message: `User already exists in Firestore with role: ${existingUser.role}`,
          user: existingUser
        });
      } else {
        // Create new user in Firestore
        const userId = await userService.addUser({
          email: user.email,
          displayName: user.displayName || '',
          role: 'admin', // Set as admin for the first sync
          active: true
        });

        setResult({
          type: 'success',
          message: 'User successfully added to Firestore with admin role!',
          userId
        });

        // Refresh the page to update the auth context
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Error syncing user:', error);
      setResult({
        type: 'error',
        message: `Error: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert color="warning" icon={HiExclamationCircle}>
          <span className="font-medium">Not authenticated!</span> Please log in first.
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Sync Google User to Firestore
        </h1>
        
        <div className="space-y-4">
          <Alert color="info" icon={HiInformationCircle}>
            <div>
              <span className="font-medium">Current Google User:</span>
              <ul className="mt-2 space-y-1 text-sm">
                <li><strong>Email:</strong> {user.email}</li>
                <li><strong>Name:</strong> {user.displayName || 'Not set'}</li>
                <li><strong>UID:</strong> {user.uid}</li>
                <li><strong>Current Role:</strong> {user.role || 'Not found in Firestore'}</li>
              </ul>
            </div>
          </Alert>

          <div className="space-y-2">
            <p className="text-gray-700">
              This utility will add your current Google account to the Firestore users collection 
              with admin privileges so you can access all features of the app.
            </p>
            
            <p className="text-sm text-gray-600">
              <strong>What this does:</strong>
            </p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Checks if your email exists in the Firestore users collection</li>
              <li>If not found, creates a new user record with admin role</li>
              <li>If found, shows your current role information</li>
              <li>Automatically refreshes the page to update your permissions</li>
            </ul>
          </div>

          <Button
            onClick={syncUser}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Syncing...' : 'Sync User to Firestore'}
          </Button>

          {result && (
            <Alert
              color={result.type === 'success' ? 'success' : result.type === 'error' ? 'failure' : 'info'}
              icon={result.type === 'success' ? HiCheckCircle : HiInformationCircle}
            >
              <span className="font-medium">{result.message}</span>
              {result.type === 'success' && (
                <div className="mt-2 text-sm">
                  Page will refresh automatically in 2 seconds to update your permissions.
                </div>
              )}
            </Alert>
          )}
        </div>
      </Card>
    </div>
  );
} 