import { ButtonHTMLAttributes } from "react";

export function Spinner({ size = 20, className = "text-blue-700" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// Full page / route-level loading
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner size={40} />
      <p className="text-sm font-medium text-gray-800">{label}</p>
    </div>
  );
}

// Inside a page or modal
export function SectionLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white p-8"
    >
      <Spinner size={24} />
      <span className="text-sm font-medium text-gray-800">{label}</span>
    </div>
  );
}

// Placeholder for the orders table
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-live="polite" className="overflow-hidden rounded-lg border border-gray-300 bg-white">
      <div className="h-10 bg-gray-100" />
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// Button with spinner and busy state
type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  ...rest
}: LoadingButtonProps) {
  return (
    <button {...rest} disabled={disabled || loading} aria-busy={loading} className={className}>
      {loading && <Spinner size={16} className="text-current" />}
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}