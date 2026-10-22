import { djangoCookies, djangoOrigin, privateHeaders } from "./django";

const OPERATIONS: Record<string, readonly string[]> = {
  "/api/v1/auth/csrf/": ["GET"],
  "/api/v1/auth/me/": ["GET"],
  "/api/v1/auth/register/": ["POST"],
  "/api/v1/auth/login/": ["POST"],
  "/api/v1/auth/logout/": ["POST"],
  "/api/v1/accounts/": ["GET", "POST"],
};

function failure(status: number, message: string): Response {
  return Response.json(
    { error: { status_code: status, message } },
    {
      status,
      headers: privateHeaders(),
    }
  );
}

/** A narrow transport bridge; Django still authenticates/authorizes every API request. */
export async function forwardDjango(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = `${url.pathname.replace(/\/$/, "")}/`;
  const methods = OPERATIONS[path];
  if (!methods) return failure(404, "API operation is not available in this integration.");
  if (!methods.includes(request.method)) return failure(405, "Method not allowed.");
  const headers = new Headers({ Accept: "application/json" });
  headers.set("Cookie", djangoCookies(request.headers.get("cookie")));
  let body: string | undefined;
  if (request.method === "POST") {
    // Do not rewrite the browser's Origin to make an untrusted origin pass Django CSRF.
    if (
      request.headers.get("origin") !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return failure(403, "A same-origin request is required.");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return failure(415, "Use application/json.");
    }
    if (Number(request.headers.get("content-length")) > 65_536)
      return failure(413, "Request too large.");
    body = await request.text();
    if (new TextEncoder().encode(body).length > 65_536) return failure(413, "Request too large.");
    headers.set("Content-Type", "application/json");
    for (const key of ["Origin", "X-CSRFToken", "Idempotency-Key"]) {
      const value = request.headers.get(key);
      if (value) headers.set(key, value);
    }
  } else if (
    url.search &&
    (path !== "/api/v1/accounts/" ||
      [...url.searchParams.keys()].some((key) => key !== "page") ||
      !/^[1-9]\d*$/.test(url.searchParams.get("page") || ""))
  ) {
    return failure(400, "Unsupported query parameters.");
  }
  try {
    const upstream = await fetch(`${djangoOrigin()}${path}${url.search}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    const responseHeaders = privateHeaders();
    for (const name of ["Content-Type", "Retry-After", "WWW-Authenticate", "X-Request-ID"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) {
      if (!/^(sessionid|csrftoken)=/.test(cookie)) continue;
      if (/;\s*domain=/i.test(cookie))
        return failure(502, "Django must issue host-only session cookies.");
      responseHeaders.append("Set-Cookie", cookie);
    }
    if (upstream.status === 204)
      return new Response(null, { status: 204, headers: responseHeaders });
    if (!upstream.headers.get("content-type")?.includes("application/json")) {
      return failure(502, "The authentication service returned an invalid response.");
    }
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    // Neither request bodies, cookies nor upstream exception text are safe to log.
    return failure(
      503,
      "The service is temporarily unavailable. A write may have completed; check its status before retrying."
    );
  }
}
