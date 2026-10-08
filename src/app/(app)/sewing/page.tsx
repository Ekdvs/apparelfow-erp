"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import RoleGate from "@/components/RoleGate";
import { LightBadge } from "@/components/StatusBadge";
import { sewingApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/axios";
import { btnPrimary } from "@/lib/ui";
import { SewingOrder } from "@/types";

export default function SewingPage() {
  const [orders, setOrders] = useState<SewingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await sewingApi.queue());
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    sewingApi
      .queue()
      .then((nextOrders) => {
        if (!cancelled) setOrders(nextOrders);
      })
      .catch((e) => {
        if (!cancelled) toast.error(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const start = async (id: string) => {
    setStartingId(id);
    try {
      await sewingApi.start(id);
      toast.success("Sewing assembly started");
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setStartingId(null);
    }
  };

  return (
    <RoleGate allow={["SEWING_SUPERVISOR"]}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Sewing Queue</h2>
        <p className="text-sm text-gray-700">Only verified batches released by the Cutting Verifier appear here.</p>
      </div>

      {loading ? (
        <p className="text-gray-700">Loading queue…</p>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-400 bg-white p-8 text-center text-gray-700">
          No verified batches waiting.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {orders.map((o) => {
            const audit = o.verificationLogs[0];
            return (
              <article key={o.id} className="rounded-lg border border-gray-300 bg-white p-5 text-sm text-gray-900">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold">{o.orderNo}</h3>
                    <p className="text-gray-800">
                      {o.recipe.name} ({o.recipe.recipeCode})
                    </p>
                  </div>
                  <span className="rounded-full border border-green-500 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-900">
                    VERIFIED
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase text-gray-700">Garments</dt>
                    <dd className="font-semibold">{o.targetQty}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-700">Fabric roll</dt>
                    <dd className="font-semibold">{o.fabricRollId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-700">Fabric used</dt>
                    <dd className="font-semibold">{o.actualFabricYds} yds</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-gray-700">Wastage</dt>
                    <dd className="font-semibold">{audit ? `${audit.wastagePct}%` : "-"}</dd>
                  </div>
                </dl>

                {audit && (
                  <p className="mt-3 rounded-md border border-gray-300 bg-gray-50 p-2 text-xs text-gray-900">
                    Verified by <span className="font-semibold">{audit.verifier.fullName}</span> on{" "}
                    {new Date(audit.timestamp).toLocaleString()}
                  </p>
                )}

                <div className="mt-4 overflow-x-auto rounded-md border border-gray-300">
                  <table className="min-w-full text-left">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-800">
                      <tr>
                        <th className="px-3 py-2">Component</th>
                        <th className="px-3 py-2">Expected</th>
                        <th className="px-3 py-2">Counted</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {o.verificationItems.map((i, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{i.component.componentName}</td>
                          <td className="px-3 py-2">{i.expectedQty}</td>
                          <td className="px-3 py-2">{i.actualQty ?? "-"}</td>
                          <td className="px-3 py-2">
                            <LightBadge light={i.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button className={`${btnPrimary} mt-4 w-full`} disabled={startingId === o.id} onClick={() => start(o.id)}>
                  {startingId === o.id ? "Starting…" : "Start Sewing Assembly"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </RoleGate>
  );
}