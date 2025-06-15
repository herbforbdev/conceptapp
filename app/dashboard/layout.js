"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import AuthGuard from "@/components/AuthGuard";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-[#fffafa]">
        {/* Sticky Header at the top (64px tall) */}
        <Header toggleSidebar={toggleSidebar} />

        {/* Main content area: add top and bottom margin for header and footer */}
        <div className="flex flex-1 pt-8 md:pt-12 pb-16 bg-transparent">
          {/* Sidebar: fixed on small screens, with top & bottom offsets */}
          <Sidebar isOpen={sidebarOpen} />
          {/* Main page content */}
          <main className="flex-1 p-8 bg-[#fffafa]">
            {children}
          </main>
        </div>

        {/* Fixed Footer at the bottom (64px tall) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-transparent">
          <Footer />
        </div>
      </div>
    </AuthGuard>
  );
} 