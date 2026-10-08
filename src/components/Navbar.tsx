"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import {  ROLE_LABEL } from "@/lib/roles";
import { btnSecondary, } from "@/lib/ui";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();


  if (!user) return null;

  

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    router.replace("/login");
  };

  return (
    <header className="border-b border-gray-300 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">ApparelFlow ERP</h1>
          <p className="text-xs text-gray-700">Cutting Gatekeeper Terminal</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-semibold text-gray-900">{user.fullName}</p>
            <p className="text-xs text-gray-700">{ROLE_LABEL[user.role]}</p>
          </div>

          

          <button onClick={handleLogout} className={btnSecondary}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}