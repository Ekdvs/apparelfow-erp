"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import LogList from "@/components/LogList";
import RoleGate from "@/components/RoleGate";
import { LightBadge, OrderStatusBadge } from "@/components/StatusBadge";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/axios";
import { evaluate } from "@/lib/traffic";
import { btnDanger, btnSecondary, btnSuccess, inputCls, inputErrCls } from "@/lib/ui";
import { validateWholeNumber } from "@/lib/validators";
import { Order } from "@/types";
import { LoadingButton, SectionLoader } from "@/components/Loader";

type Busy = null | "save" | "approve" | "reject";

export default function VerifierTerminal() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({}); // keyed by componentId
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);

  useEffect(() => {
    (async () => {
      try {
        const o = await ordersApi.get(id);
        setOrder(o);
        setValues(
          Object.fromEntries(o.verificationItems.map((i) => [i.componentId, i.actualQty === null ? "" : String(i.actualQty)])),
        );
      } catch (e) {
        toast.error(getErrorMessage(e));
        router.replace("/verifier");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const editable = order?.status === "PENDING_VERIFICATION";

  const rows = (order?.verificationItems ?? []).map((i) => {
    const raw = values[i.componentId] ?? "";
    const error = validateWholeNumber(raw);
    const light = error ? null : evaluate(i.expectedQty, Number(raw));
    return { ...i, raw, error, light };
  });

  const hasRed = rows.some((r) => r.light === "RED");
  const allValid = rows.length > 0 && rows.every((r) => !r.error);
  const canApprove = !!editable && allValid && !hasRed && busy === null;
  const reasonErr = reason.trim().length < 5 ? "A reason of at least 5 characters is required" : null;

  const validCounts = () =>
    rows.filter((r) => !r.error).map((r) => ({ componentId: r.componentId, actualQty: Number(r.raw) }));

  const approveHint = !editable
    ? null
    : !allValid
      ? "Approve is disabled: count every component with a valid whole number."
      : hasRed
        ? "Approve is disabled: at least one component has a SHORTAGE. You may only reject this batch."
        : null;

  const handleSave = async () => {
    const counts = validCounts();
    if (counts.length === 0) return toast.error("Enter at least one valid count");
    setBusy("save");
    try {
      await ordersApi.saveCounts(id, counts);
      toast.success("Counts saved");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async () => {
    if (!canApprove) return;
    setBusy("approve");
    try {
      await ordersApi.saveCounts(id, validCounts()); // server decides from saved counts
      await ordersApi.approve(id);
      toast.success("Batch verified and released to the Sewing Queue");
      router.push("/verifier");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setReasonTouched(true);
    if (reasonErr) return;
    setBusy("reject");
    try {
      const counts = validCounts();
      if (counts.length > 0) await ordersApi.saveCounts(id, counts); // keep variances on record
      await ordersApi.reject(id, reason.trim());
      toast.success("Batch rejected and returned to the supervisor");
      router.push("/verifier");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <RoleGate allow={["CUTTING_VERIFIER"]}>
      <Link href="/verifier" className="mb-4 inline-block text-sm font-semibold text-blue-800 hover:underline">
        ← Back to queue
      </Link>

      {loading || !order ? (
        <SectionLoader label="Loading terminal…" />
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-300 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-gray-900">Verification Terminal · {order.orderNo}</h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-sm text-gray-800">
              {order.recipe.name} ({order.recipe.recipeCode}) · {order.targetQty} garments · Roll {order.fabricRollId} ·{" "}
              {order.actualFabricYds} yds
            </p>
            {!editable && (
              <p className="mt-3 rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900">
                This order is {order.status.replace("_", " ").toLowerCase()} and can no longer be edited.
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
            <table className="min-w-full text-left text-sm text-gray-900">
              <thead className="bg-gray-100 text-xs uppercase text-gray-800">
                <tr>
                  <th className="px-4 py-3">Component</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Counted</th>
                  <th className="px-4 py-3">Variance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((r) => {
                  const showErr = touched[r.componentId] && r.error;
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3 font-medium">{r.component.componentName}</td>
                      <td className="px-4 py-3">{r.expectedQty}</td>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Counted ${r.component.componentName}`}
                          inputMode="numeric"
                          disabled={!editable}
                          className={`${inputCls} !w-28 ${showErr ? inputErrCls : ""}`}
                          value={r.raw}
                          onChange={(e) => setValues((v) => ({ ...v, [r.componentId]: e.target.value }))}
                          onBlur={() => setTouched((t) => ({ ...t, [r.componentId]: true }))}
                          placeholder="0"
                        />
                        {showErr && (
                          <p role="alert" className="mt-1 max-w-[16rem] text-xs font-medium text-red-700">
                            {r.error}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {r.error ? "-" : `${Number(r.raw) - r.expectedQty > 0 ? "+" : ""}${Number(r.raw) - r.expectedQty}`}
                      </td>
                      <td className="px-4 py-3">
                        <LightBadge light={r.light} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editable && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-300 bg-white p-5">
                <h3 className="mb-3 font-bold text-gray-900">Approve batch</h3>
                <div className="flex flex-wrap gap-2">
                  <LoadingButton className={btnSecondary} onClick={handleSave} loading={busy === "save"} loadingText="Saving…" disabled={busy !== null}>
                    Save counts
                  </LoadingButton>

                  <LoadingButton
                    className={btnSuccess}
                    onClick={handleApprove}
                    loading={busy === "approve"}
                    loadingText="Approving…"
                    disabled={!canApprove && busy !== "approve"}
                    title={approveHint ?? "Approve and release to sewing"}
                  >
                    Approve batch
                  </LoadingButton>
                </div>
                {approveHint && <p className="mt-3 text-sm font-medium text-red-800">{approveHint}</p>}
              </div>

              <div className="rounded-lg border border-gray-300 bg-white p-5">
                <h3 className="mb-3 font-bold text-gray-900">Reject batch</h3>
                <label htmlFor="reason" className="mb-1 block text-sm font-semibold text-gray-900">
                  Rejection reason (mandatory)
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  className={`${inputCls} ${reasonTouched && reasonErr ? inputErrCls : ""}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => setReasonTouched(true)}
                  placeholder="e.g. 10 sleeves short, fabric defect on roll"
                />
                {reasonTouched && reasonErr && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                    {reasonErr}
                  </p>
                )}
                <LoadingButton className={`${btnDanger} mt-3`} onClick={handleReject} loading={busy === "reject"} loadingText="Rejecting…" disabled={busy !== null}>
                  Reject batch
                </LoadingButton>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-300 bg-white p-5">
            <h3 className="mb-3 font-bold text-gray-900">Verification history</h3>
            <LogList logs={order.verificationLogs ?? []} />
          </div>
        </div>
      )}
    </RoleGate>
  );
}