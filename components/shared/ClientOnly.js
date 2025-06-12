"use client";

import { useEffect, useState } from 'react';

/**
 * ClientOnly wrapper to safely render client components
 * @param {Object} props - Component props
 * @param {JSX.Element} props.children - The child component to render only on the client
 * @param {JSX.Element} [props.fallback] - Optional fallback to show during SSR
 * @returns {JSX.Element} The wrapped component
 */
export default function ClientOnly({ children, fallback = null }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return fallback;
  }

  return children;
} 