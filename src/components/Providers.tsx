"use client";

import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { color: "#111827", background: "#ffffff", border: "1px solid #d1d5db" },
        }}
      />
    </AuthProvider>
  );
}