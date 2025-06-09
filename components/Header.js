// components/Header.js
"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { HiSun, HiMoon, HiUser, HiSearch } from "react-icons/hi";
import { useAuth } from "@/context/AuthContext";
import Notifications from './Notifications';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Wait for component to mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="w-full flex items-center justify-between px-8 py-4 bg-white rounded-2xl shadow-lg border border-[#cdd7df] mt-4 mb-8 mx-auto max-w-[98vw] min-h-[72px]">
      {/* Left: Greeting */}
      <div className="flex items-center gap-4 min-w-[260px]">
        <span className="text-2xl font-extrabold text-[#031b31] tracking-tight">
          {user?.displayName ? `Good morning, ${user.displayName.split(' ')[0]}!` : 'Good morning!'}
        </span>
      </div>
      {/* Center: Spacer (for symmetry) */}
      <div className="flex-1" />
      {/* Right: Icons and Profile */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle button */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 hover:bg-[#e6eaf0] transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <HiSun className="h-5 w-5 text-yellow-400" />
            ) : (
              <HiMoon className="h-5 w-5 text-[#385e82]" />
            )}
          </button>
        )}
        {/* Search button */}
        <button className="rounded-full p-2 hover:bg-[#e6eaf0] transition-colors">
          <HiSearch className="h-5 w-5 text-[#385e82]" />
        </button>
        {/* Notifications button */}
        <Notifications />
        {/* User Profile Picture */}
        <div className="ml-2">
          {user ? (
            <div className="relative group">
              <Link href="/dashboard/profile">
                <button className="rounded-full p-1 hover:bg-[#e6eaf0] transition-colors">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#b4c3d0] bg-[#e6eaf0] flex items-center justify-center">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || 'User profile'}
                        width={36}
                        height={36}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <HiUser className="h-6 w-6 text-[#385e82]" />
                    )}
                  </div>
                </button>
              </Link>
              {/* Enhanced tooltip with user name and role */}
              <div className="absolute hidden group-hover:block right-0 mt-2 py-2 px-3 bg-white text-sm rounded-lg shadow-lg border border-[#cdd7df] min-w-[200px]">
                <div className="font-medium text-gray-900">{user.displayName || user.email}</div>
                {user.role && (
                  <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">Click to view profile</div>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <button className="rounded-full p-1 hover:bg-[#e6eaf0] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#e6eaf0] flex items-center justify-center border-2 border-[#b4c3d0]">
                  <HiUser className="h-6 w-6 text-[#385e82]" />
                </div>
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
