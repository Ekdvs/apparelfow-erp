import { VerificationLog } from "@/types";

export default function LogList({ logs }: { logs: VerificationLog[] }) {
  if (logs.length === 0) return <p className="text-sm text-gray-700">No verification decisions yet.</p>;

  return (
    <ul className="space-y-2">
      {logs.map((l) => (
        <li key={l.id} className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`font-semibold ${l.decision === "APPROVED" ? "text-green-800" : "text-red-800"}`}>
              {l.decision}
            </span>
            <span className="text-xs text-gray-700">
              {l.verifier.fullName} · {new Date(l.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-800">Fabric wastage: {l.wastagePct}%</p>
          {l.rejectionNote && (
            <p className="mt-1 text-sm">
              <span className="font-semibold">Reason:</span> {l.rejectionNote}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}