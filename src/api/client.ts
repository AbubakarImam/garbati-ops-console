// The one shared HTTP call path every screen in this app uses to reach OpsApi - DESIGN.md Section 4
// step 4: "Any API call anywhere in the app that comes back 401 ... redirects to Login the same way -
// one shared handler ... not re-implemented per screen." Every function in src/api/ goes through
// `apiFetch`, so registering the 401 handler once here (from AuthContext, the only place that may act on
// it) covers every query and every mutation in the app without each screen doing anything special.
//
// All requests are same-origin in both dev (Vite's server.proxy, vite.config.ts) and production (OpsApi
// serves this app's own built assets, Garbati.OpsApi/docs/DESIGN.md 2.1b) - so the HttpOnly session
// cookie is sent automatically by the browser on every request; this app's code never reads or sets it.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

// Registered exactly once, by AuthContext (src/auth/AuthContext.tsx) - see its own comment for why it,
// and only it, is allowed to react to a 401.
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  if (response.status === 401) {
    // DESIGN.md Section 4 step 4: session missing/expired/revoked, from ANY call - route to Login via
    // the one shared handler, regardless of which screen made this call.
    unauthorizedHandler?.();
    throw new ApiError(401, "Not authenticated.");
  }

  // 422 is a business-rule failure, not a transport error (ReversalRequestsController.Approve's own
  // comment: "the approve ACTION itself always succeeds here ... but ExecutionFailed is still a
  // business-rule failure, returned with 422, not a fabricated 200" - same shape TestingConsoleController
  // uses for a failed account-opening/transfer/funding). The response body in every one of these cases
  // is still the real domain object (status: "ExecutionFailed"/"Failed" plus a failure reason) that the
  // calling screen already knows how to render - so this is returned to the caller like any other
  // success, not thrown as an ApiError the caller would have to unwrap again.
  if (response.status === 422) {
    return (await parseBody(response)) as TResponse;
  }

  if (!response.ok) {
    const body = await parseBody(response);
    const message =
      (typeof body === "string" && body) ||
      (typeof body === "object" && body !== null && "title" in body && typeof (body as { title: unknown }).title === "string"
        ? (body as { title: string }).title
        : undefined) ||
      `Request to ${path} failed with ${response.status}.`;
    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await parseBody(response)) as TResponse;
}

export const apiGet = <T>(path: string): Promise<T> => apiFetch<T>(path);

export const apiPost = <T>(path: string, body?: unknown): Promise<T> =>
  apiFetch<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const apiPatch = <T>(path: string, body?: unknown): Promise<T> =>
  apiFetch<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
