"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { HOME } from "@/lib/roles";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? HOME[user.role] : "/login");
  }, [loading, user, router]);

  return <p className="p-8 text-gray-700">Loading…</p>;
}