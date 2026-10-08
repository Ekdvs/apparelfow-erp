"use client";

import { useState } from "react";
import Link from "next/link";
import OrdersTable from "@/components/OrdersTable";
import RoleGate from "@/components/RoleGate";
import { useOrders } from "@/hooks/useOrders";
import { btnPrimary, btnSecondary, inputCls } from "@/lib/ui";
import { OrderStatus } from "@/types";
import { TableSkeleton } from "@/components/Loader";

export default function VerifierPage() {
  const { orders, loading } = useOrders();
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("PENDING_VERIFICATION");
  const shown = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <RoleGate allow={["CUTTING_VERIFIER"]}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Verification Queue</h2>
        <p className="text-sm text-gray-700">Count physical pieces and approve or reject each batch.</p>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="filter" className="text-sm font-semibold text-gray-900">
          Show
        </label>
        <select
          id="filter"
          className={`${inputCls} !w-auto`}
          value={filter}
          onChange={(e) => setFilter(e.target.value as "ALL" | OrderStatus)}
        >
          <option value="PENDING_VERIFICATION">Pending verification</option>
          <option value="REJECTED">Rejected</option>
          <option value="VERIFIED">Verified</option>
          <option value="IN_SEWING">In sewing</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {loading ? (
         <TableSkeleton /> 
      ) : (
        <OrdersTable
          orders={shown}
          action={(o) => (
            <Link href={`/verifier/${o.id}`} className={o.status === "PENDING_VERIFICATION" ? btnPrimary : btnSecondary}>
              {o.status === "PENDING_VERIFICATION" ? "Open terminal" : "View"}
            </Link>
          )}
        />
      )}
    </RoleGate>
  );
}