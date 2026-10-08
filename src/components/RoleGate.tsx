"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { HOME } from "@/lib/roles";
import { Role } from "@/types";

export default function RoleGate({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const ok = !!user && allow.includes(user.role);

    useEffect(() => {
        if (user && !ok) router.replace(HOME[user.role]);
    }, [user, ok, router]);

    return ok ? <>{children}</> : null;
}