"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { PageLoader } from "@/components/Loader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user)  return <PageLoader label="Checking your session…" />;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}