"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Alert } from 'flowbite-react';
import { FcGoogle } from 'react-icons/fc';
import { SiMarketo } from "react-icons/si";
import { HiExclamationCircle, HiLockClosed } from 'react-icons/hi';
import { motion } from "framer-motion";
import Link from 'next/link';

export default function Login() {
  const { user, loading, authError, isAuthorized } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirect to dashboard if already logged in and authorized
  useEffect(() => {
    if (user && !loading && isAuthorized) {
      router.replace("/dashboard");
    }
  }, [user, loading, isAuthorized, router]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign in error:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4"
      >
        <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-[#385e82]/10">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-[#031b31] p-3 rounded-xl">
                <SiMarketo className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#1c2541] mb-2">Welcome to Concept</h1>
            <p className="text-[#415A77]">Sign in to access your dashboard</p>
          </div>

          {/* Authorization Error */}
          {authError && (
            <div className="mb-6">
              <Alert
                color={authError.type === 'ACCOUNT_DISABLED' ? 'warning' : 'failure'}
                icon={authError.type === 'ACCOUNT_DISABLED' ? HiLockClosed : HiExclamationCircle}
              >
                <div>
                  <span className="font-medium">{authError.message}</span>
                  {authError.type === 'NOT_AUTHORIZED' && (
                    <div className="mt-2">
                      <Link href="/request-access" className="text-sm underline">
                        Demander l&apos;accès à l&apos;application →
                      </Link>
                    </div>
                  )}
                </div>
              </Alert>
            </div>
          )}

          {/* Sign In Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 bg-white text-[#1c2541] border border-[#385e82]/20 hover:bg-[#385e82]/5 transition-all duration-200 py-2.5 rounded-xl font-medium"
          >
            <FcGoogle className="h-5 w-5" />
            {isSigningIn ? 'Se connecter...' : 'Continuer avec Google'}
          </Button>

          {/* Request Access Link */}
          {!authError && (
            <div className="mt-4 text-center">
              <p className="text-sm text-[#415A77]">
                Pas encore d&apos;accès?{' '}
                <Link href="/request-access" className="text-[#385e82] hover:underline font-medium">
                                      Demander l&apos;accès
                </Link>
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[#415A77]">
              By signing in, you agree to our{' '}
              <a href="#" className="text-[#385e82] hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-[#385e82] hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#385e82]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#385e82]/5 rounded-full blur-3xl" />
        </div>
      </motion.div>
    </div>
  );
}