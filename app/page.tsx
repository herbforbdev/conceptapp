// app/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "../hooks/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If user exists, redirect to dashboard; otherwise, redirect to login
      router.replace(user ? "/dashboard" : "/login");
    }
  }, [user, loading, router]);

  return <p>Loading...</p>;
}
