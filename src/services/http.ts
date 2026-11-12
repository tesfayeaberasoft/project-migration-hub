// Single HTTP entry point for every service module.
// Talks to the PHP backend with a Bearer token, or to the in-browser demo backend.

import type { ApiErrorShape } from "@/types";
import { API_BASE_URL, USE_DEMO_BACKEND } from "./config";
import { readSession, UNAUTHORIZED_EVENT, writeSession } from "./session";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  fieldErrors?: Record<string, string> | undefined;
  constructor(message: string, status = 500, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

function buildQuery(query?: Query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function httpRequest<T>(method: HttpMethod, path: string, body?: unknown, query?: Query): Promise<T> {
  const session = readSession();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }

  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  const envelope = (json ?? {}) as { success?: boolean; message?: string; error?: string; data?: unknown; errors?: Record<string, string> };

  if (res.status === 401) {
    writeSession(null);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!res.ok || envelope.success === false) {
    throw new ApiError(
      envelope.message || envelope.error || `Request failed (${res.status})`,
      res.status,
      envelope.errors,
    );
  }
  // Accept both `{ data: ... }` envelopes and bare JSON bodies.
  return (json && typeof json === "object" && "data" in (json as object) ? envelope.data : json) as T;
}

async function request<T>(method: HttpMethod, path: string, body?: unknown, query?: Query): Promise<T> {
  if (USE_DEMO_BACKEND) {
    const { demoRequest } = await import("./mock/handlers");
    return demoRequest<T>(method, path, body, query);
  }
  return httpRequest<T>(method, path, body, query);
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  del: <T>(path: string) => request<T>("DELETE", path),
};

export function errorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
