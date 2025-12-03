"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/supabase";
import LoginPage from "@/components/login-page";
import DashboardLayout from "@/components/dashboard-layout";
import DashboardPage from "@/components/dashboard-page";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          return;
        }
      } catch {}
      setIsAuthenticated(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
      } else if (event === "SIGNED_IN" && session) {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout onLogout={handleLogout}>
      <DashboardPage />
    </DashboardLayout>
  );
}
