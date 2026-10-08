"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Field from "@/components/Field";
import LogList from "@/components/LogList";
import Modal from "@/components/Modal";
import { LightBadge, OrderStatusBadge } from "@/components/StatusBadge";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/axios";
import { btnPrimary, inputCls, inputErrCls } from "@/lib/ui";
import { validatePositiveDecimal } from "@/lib/validators";
import { Order } from "@/types";
import { LoadingButton, SectionLoader } from "./Loader";

export default function OrderDetailModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [yards, setYards] = useState("");
  const [yardsTouched, setYardsTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ordersApi
      .get(id)
      .then(setOrder)
      .catch((e) => {
        toast.error(getErrorMessage(e));
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const yardsErr = yards.trim() ? validatePositiveDecimal(yards) : null;

  const resubmit = async () => {
    setYardsTouched(true);
    if (yardsErr) return;
    setBusy(true);
    try {
      await ordersApi.resubmit(id, yards.trim() ? Number(yards) : undefined);
      toast.success("Order resubmitted for verification");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={order ? `Order ${order.orderNo}` : "Order"} onClose={onClose} wide>
      {!order ? (
        <SectionLoader label="Loading order…" />
      ) : (
        <div className="space-y-5 text-sm text-gray-900">
          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusBadge status={order.status} />
            <span>
              {order.recipe.name} ({order.recipe.recipeCode}) · {order.targetQty} garments · Roll {order.fabricRollId} ·{" "}
              {order.actualFabricYds} yds
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border border-gray-300">
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
                {order.verificationItems.map((i) => (
                  <tr key={i.id}>
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

          <div>
            <h3 className="mb-2 font-semibold">Verification history</h3>
            <LogList logs={order.verificationLogs ?? []} />
          </div>

          {order.status === "REJECTED" && (
            <div className="rounded-md border border-red-300 bg-red-50 p-4">
              <p className="mb-3 font-semibold text-red-900">
                Rejected. Re-cut the pieces, then resubmit for verification.
              </p>
              <Field
                label="Updated fabric used (yards, optional)"
                htmlFor="resubmit-yards"
                error={yardsTouched ? yardsErr : null}
              >
                <input
                  id="resubmit-yards"
                  inputMode="decimal"
                  className={`${inputCls} ${yardsTouched && yardsErr ? inputErrCls : ""}`}
                  value={yards}
                  onChange={(e) => setYards(e.target.value)}
                  placeholder={`Current: ${order.actualFabricYds}`}
                />
              </Field>
              <LoadingButton onClick={resubmit} loading={busy} loadingText="Resubmitting…" className={`${btnPrimary} mt-3`}>
                Resubmit for verification
              </LoadingButton>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}