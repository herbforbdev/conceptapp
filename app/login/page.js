"use client";

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
  const { user, loading, authError, isAuthorized, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showFirstTimeMessage, setShowFirstTimeMessage] = useState(false);

  // Redirect to dashboard if already logged in and authorized
  useEffect(() => {
    if (user && !loading && isAuthorized) {
      // Check if there's a redirect URL stored
      const redirectTo = localStorage.getItem('redirectAfterLogin') || '/dashboard';
      localStorage.removeItem('redirectAfterLogin');
      router.replace(redirectTo);
    }
  }, [user, loading, isAuthorized, router]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google sign in error:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl flex bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Left Side - Form */}
        <div className="w-1/2 p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-[#031b31] p-3 rounded-xl">
                <SiMarketo className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#1c2541] mb-2">Bienvenue sur Ice Concept</h1>
            <p className="text-[#415A77]">Connectez-vous pour accéder au dashboard</p>
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

          {showFirstTimeMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">First time login!</strong>
              <span className="block sm:inline"> Please change your password.</span>
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

        {/* Right Side - Image */}
        <div className="w-1/2 hidden md:block">
          <img src="/IM-Bidon Transparent 2.jpg" alt="Login Image" className="object-contain h-full w-full" />
        </div>
      </motion.div>

      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#385e82]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#385e82]/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}