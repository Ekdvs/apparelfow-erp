import axios, { AxiosResponse } from "axios";

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  error: unknown;
}

const api = axios.create({
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? "";
    
    if (status === 401 && !url.includes("/api/auth/") && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export async function unwrap<T>(request: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  const res = await request;
  return res.data.data;
}

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as
      | {
          message?: string;
          error?: {
            fieldErrors?: Record<string, string[]>;
            blockers?: { component: string; reason: string }[];
          } | null;
        }
      | undefined;

    const firstField = body?.error?.fieldErrors && Object.values(body.error.fieldErrors).flat()[0];
    if (firstField) return firstField;

    const blockers = body?.error?.blockers;
    if (blockers?.length) {
      return `${body?.message}: ${blockers.map((b) => `${b.component} (${b.reason})`).join(", ")}`;
    }
    return body?.message ?? err.message;
  }
  return fallback;
}

export default api;