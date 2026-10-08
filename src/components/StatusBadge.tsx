import { Light, OrderStatus } from "@/types";

const orderStyles: Record<OrderStatus, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-900 border-amber-400",
  VERIFIED: "bg-green-100 text-green-900 border-green-500",
  REJECTED: "bg-red-100 text-red-900 border-red-500",
  IN_SEWING: "bg-blue-100 text-blue-900 border-blue-500",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${orderStyles[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

const lightStyles: Record<Light, { cls: string; label: string }> = {
  GREEN: { cls: "bg-green-100 text-green-900 border-green-500", label: "GREEN · MATCH" },
  YELLOW: { cls: "bg-yellow-100 text-yellow-900 border-yellow-500", label: "YELLOW · EXCESS" },
  RED: { cls: "bg-red-100 text-red-900 border-red-500", label: "RED · SHORTAGE" },
};

export function LightBadge({ light }: { light: Light | null }) {
  if (!light) {
    return (
      <span className="inline-block rounded-full border border-gray-400 bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
        NOT COUNTED
      </span>
    );
  }
  const s = lightStyles[light];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}