"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { motion } from "framer-motion";
import { FiSettings } from "react-icons/fi";
import { SiMarketo } from "react-icons/si";
import { FaRegMoneyBill1 } from "react-icons/fa6";
import { 
  RiBuilding2Fill, 
  RiPantoneFill, 
  RiStackFill, 
  RiStore3Fill,
  RiShoppingCartFill,
  RiBarChartBoxFill,
} from "react-icons/ri";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const Sidebar = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const { t } = useLanguage();
  
  // Add state to handle client-side rendering
  const [isClient, setIsClient] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    setIsClient(true);

    // Touch support for tablets: expand on touch, collapse on outside touch
    const handleTouchStart = (e) => {
      setExpanded(true);
    };
    const handleTouchEnd = (e) => {
      // Collapse only if touch ends outside the sidebar
      if (!e.target.closest('.sidebar-touch-area')) {
        setExpanded(false);
      }
    };
    const sidebar = document.querySelector('.sidebar-touch-area');
    if (sidebar) {
      sidebar.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      if (sidebar) {
        sidebar.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, []);

  // SidebarLink Component with proper active state handling
  const SidebarLink = ({ href, icon, label, expanded }) => {
    const isActive = pathname === href;
    
    return (
      <Link href={href}>
        <div
          className={`cursor-pointer my-2 flex items-center px-3 py-2 rounded-lg transition-all duration-200
            ${isActive
              ? "bg-[#052c4f] text-white"
              : "text-[#b4c3d0] hover:bg-[#385e82] hover:text-white"}
          `}
        >
          <span className="text-xl">{icon}</span>
          {label && (
            <span className="ml-3 text-base font-medium whitespace-nowrap">{label}</span>
          )}
        </div>
      </Link>
    );
  };



  return (
    <div className="flex">
      {/* Sidebar */}
      <motion.div
  // entry animation
  initial={{ x: -20, opacity: 0 }}
  animate={{
    x: 0,
    opacity: 1,
    // animate width instead of toggling Tailwind w- classes
    width: expanded ? 224 : 72            // 224px (14rem) vs 72px (4.5rem)
  }}
  transition={{ duration: 0.4, ease: "easeInOut" }}
  
  // pin to left edge and hide overflow during collapse
  style={{
    left: 0,
    overflow: "hidden",
    transformOrigin: "left center"
  }}

  onMouseEnter={() => setExpanded(true)}
  onMouseLeave={() => setExpanded(false)}
  className={`
    fixed
    h-[80vh]
    top-[12%]           /* your vertical position */
    pt-8 px-3 pb-3      /* custom padding */
    flex flex-col justify-between
    z-40
    bg-[#031b31] border-r border-[#385e82]
    shadow-xl rounded-2xl
    m-3                 /* if you still want that outer margin */
    sidebar-touch-area
  `}
      >
        <div className="flex flex-col items-center w-full">
          {/* App Logo */}
          <Link href="/dashboard">
            <div className={`mb-4 flex items-center justify-center w-full ${expanded ? 'pl-2' : ''}`}>
              <span className="text-white text-2xl"><SiMarketo size={28} /></span>
              {expanded && <span className="ml-3 text-lg font-bold tracking-wide text-white">Concept</span>}
            </div>
          </Link>

          <span className="border-b border-[#385e82] w-full mb-2"></span>

          {/* Sidebar Links with labels */}
          <div className="flex flex-col gap-1 mt-2 w-full">
            <SidebarLink href="/dashboard/production" icon={<RiBuilding2Fill size={22} />} label={expanded ? String(t('navigation.production') || 'Production') : null} expanded={expanded} />
            <SidebarLink href="/dashboard/inventory" icon={<RiStore3Fill size={22} />} label={expanded ? String(t('navigation.inventory') || 'Inventory') : null} expanded={expanded} />
            <SidebarLink href="/dashboard/sales" icon={<RiShoppingCartFill size={22} />} label={expanded ? String(t('navigation.sales') || 'Sales') : null} expanded={expanded} />
            <SidebarLink href="/dashboard/costs" icon={<FaRegMoneyBill1 size={22} />} label={expanded ? String(t('navigation.costs') || 'Costs') : null} expanded={expanded} />
            <SidebarLink href="/dashboard/master-data" icon={<RiPantoneFill size={22} />} label={expanded ? String(t('navigation.masterData') || 'Master Data') : null} expanded={expanded} />
            {user?.role === "admin" && (
              <SidebarLink href="/dashboard/reports" icon={<RiBarChartBoxFill size={22} />} label={expanded ? String(t('navigation.reports') || 'Reports') : null} expanded={expanded} />
            )}
            {user?.role === "admin" && (
              <SidebarLink href="/dashboard/profitability" icon={<RiStackFill size={22} />} label={expanded ? String(t('navigation.profitability') || 'Profitability') : null} expanded={expanded} />
            )}
            <SidebarLink href="/dashboard/settings" icon={<FiSettings size={22} />} label={expanded ? String(t('navigation.settings') || 'Settings') : null} expanded={expanded} />
          </div>
        </div>
      </motion.div>

      {/* Page Content */}
      <main className={`${expanded ? 'ml-56' : 'ml-20'} w-full transition-all duration-300`}>{children}</main>
    </div>
  );
};

export default Sidebar;
