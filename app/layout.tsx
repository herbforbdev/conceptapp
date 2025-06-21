// app/layout.js
"use client";

import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Spline+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen transition-colors duration-150 font-sans">
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
