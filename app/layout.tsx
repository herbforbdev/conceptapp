// app/layout.js
"use client";

import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ReactNode } from "react";
import { Spline_Sans } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

const splineSans = Spline_Sans({ subsets: ['latin'], variable: '--font-spline-sans' });

export default function RootLayout({ children }: RootLayoutProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en" suppressHydrationWarning className={splineSans.className}>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body className="min-h-screen transition-colors duration-150">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <LanguageProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
