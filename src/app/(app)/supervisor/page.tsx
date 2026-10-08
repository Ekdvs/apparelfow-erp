"use client";

import { useState } from "react";
import CreateOrderModal from "@/components/CreateOrderModal";
import OrderDetailModal from "@/components/OrderDetailModal";
import OrdersTable from "@/components/OrdersTable";
import RoleGate from "@/components/RoleGate";
import { useOrders } from "@/hooks/useOrders";
import { btnPrimary, btnSecondary, inputCls } from "@/lib/ui";
import { OrderStatus } from "@/types";
import { TableSkeleton } from "@/components/Loader";

const STATS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING_VERIFICATION", label: "Pending verification" },
  { status: "REJECTED", label: "Rejected (re-cut)" },
  { status: "VERIFIED", label: "Verified" },
  { status: "IN_SEWING", label: "In sewing" },
];

export default function SupervisorPage() {
  const { orders, loading, reload } = useOrders();
  const [showCreate, setShowCreate] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");

  const shown = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <RoleGate allow={["CUTTING_SUPERVISOR"]}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cutting Orders</h2>
          <p className="text-sm text-gray-700">Create batches and track cutting progress.</p>
        </div>
        <button className={btnPrimary} onClick={() => setShowCreate(true)}>
          + New cutting order
        </button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.status} className="rounded-lg border border-gray-300 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-700">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{orders.filter((o) => o.status === s.status).length}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="filter" className="text-sm font-semibold text-gray-900">
          Filter
        </label>
        <select
          id="filter"
          className={`${inputCls} !w-auto`}
          value={filter}
          onChange={(e) => setFilter(e.target.value as "ALL" | OrderStatus)}
        >
          <option value="ALL">All statuses</option>
          {STATS.map((s) => (
            <option key={s.status} value={s.status}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
         <TableSkeleton /> 
      ) : (
        <OrdersTable
          orders={shown}
          action={(o) => (
            <button className={btnSecondary} onClick={() => setViewId(o.id)}>
              {o.status === "REJECTED" ? "View / Resubmit" : "View"}
            </button>
          )}
        />
      )}

      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onCreated={reload} />}
      {viewId && <OrderDetailModal id={viewId} onClose={() => setViewId(null)} onChanged={reload} />}
    </RoleGate>
  );
}