import { djangoCookies, djangoOrigin, privateHeaders } from "./django";
import { upstreamTimeoutMs } from "../api/timeouts";

const OPERATIONS: Record<string, readonly string[]> = {
  "/api/v1/auth/csrf/": ["GET"],
  "/api/v1/auth/me/": ["GET"],
  "/api/v1/auth/register/": ["POST"],
  "/api/v1/auth/login/": ["POST"],
  "/api/v1/auth/logout/": ["POST"],
  "/api/v1/accounts/": ["GET", "POST"],
  "/api/v1/categories/": ["GET", "POST"],
  "/api/v1/categories/defaults/": ["POST"],
  "/api/v1/transactions/": ["GET", "POST"],
  "/api/v1/dashboard/": ["GET"],
  "/api/v1/accounts/summary/": ["GET"],
  "/api/v1/reports/trends/": ["GET"],
  "/api/v1/reports/breakdown/": ["GET"],
  "/api/v1/reports/funds/": ["GET"],
  "/api/v1/funds/summary/": ["GET"],
  "/api/v1/funds/batches/": ["GET"],
  "/api/v1/funds/allocations/": ["GET"],
  "/api/v1/contacts/": ["GET", "POST"],
  "/api/v1/claims/": ["GET"],
  "/api/v1/loans/": ["GET", "POST"],
  "/api/v1/settlements/": ["GET", "POST"],
  "/api/v1/shared-bills/": ["GET", "POST"],
  "/api/v1/rent/plans/": ["GET", "POST"],
  "/api/v1/rent/obligations/": ["GET"],
  "/api/v1/rent/payments/": ["GET"],
  "/api/v1/rent/reserves/": ["GET", "POST"],
  "/api/v1/rent/spending-capacity/": ["GET"],
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RESOURCE = new RegExp(`^/api/v1/(accounts|categories|transactions)/${UUID}/$`, "i");
const ACTION = new RegExp(`^/api/v1/transactions/${UUID}/(reverse|void|correct)/$`, "i");
const FUND_RESOURCE = new RegExp(`^/api/v1/funds/batches/${UUID}/(?:(journey|breakdown)/)?$`, "i");
const RELATIONSHIP_RESOURCE = new RegExp(
  `^/api/v1/(contacts|claims|loans|settlements|shared-bills)/${UUID}/$`,
  "i"
);
const RELATIONSHIP_HISTORY = new RegExp(`^/api/v1/(contacts|claims)/${UUID}/history/$`, "i");
const RELATIONSHIP_ACTION = new RegExp(
  `^/api/v1/(loans|settlements|shared-bills)/${UUID}/(reverse|correct)/$`,
  "i"
);
const RENT_RESOURCE = new RegExp(
  `^/api/v1/rent/(plans|obligations|payments|reserves)/${UUID}/$`,
  "i"
);
const RENT_PLAN_ACTION = new RegExp(`^/api/v1/rent/plans/${UUID}/(generate|obligations)/$`, "i");
const RENT_OBLIGATION_ACTION = new RegExp(
  `^/api/v1/rent/obligations/${UUID}/(payments|change-status|history)/$`,
  "i"
);
const RENT_PAYMENT_ACTION = new RegExp(`^/api/v1/rent/payments/${UUID}/(correct|reverse)/$`, "i");
const RENT_RESERVE_ACTION = new RegExp(`^/api/v1/rent/reserves/${UUID}/(adjust|history)/$`, "i");

function rentMethods(path: string): readonly string[] | undefined {
  const resource = path.match(RENT_RESOURCE);
  if (resource) return resource[1] === "plans" ? ["GET", "PATCH"] : ["GET"];
  const plan = path.match(RENT_PLAN_ACTION);
  if (plan) return plan[1] === "generate" ? ["POST"] : ["GET"];
  const obligation = path.match(RENT_OBLIGATION_ACTION);
  if (obligation)
    return obligation[1] === "payments"
      ? ["GET", "POST"]
      : obligation[1] === "history"
        ? ["GET"]
        : ["POST"];
  if (RENT_PAYMENT_ACTION.test(path)) return ["POST"];
  const reserve = path.match(RENT_RESERVE_ACTION);
  if (reserve) return reserve[1] === "adjust" ? ["POST"] : ["GET"];
}
const HISTORY_QUERY = new Set([
  "page",
  "period",
  "date",
  "date_from",
  "date_to",
  "amount_min",
  "amount_max",
  "account",
  "destination",
  "category",
  "kind",
  "contact",
  "payment_method",
  "merchant",
  "search",
  "sort",
  "ordering",
]);

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
  const resource = path.match(RESOURCE);
  const relationship = path.match(RELATIONSHIP_RESOURCE);
  const methods =
    OPERATIONS[path] ??
    rentMethods(path) ??
    (relationship
      ? relationship[1] === "contacts"
        ? ["GET", "PATCH"]
        : ["GET"]
      : RELATIONSHIP_HISTORY.test(path)
        ? ["GET"]
        : RELATIONSHIP_ACTION.test(path)
          ? ["POST"]
          : FUND_RESOURCE.test(path)
            ? ["GET"]
            : resource
              ? resource[1] === "transactions"
                ? ["GET"]
                : ["GET", "PATCH"]
              : ACTION.test(path)
                ? ["POST"]
                : undefined);
  if (!methods) return failure(404, "API operation is not available in this integration.");
  if (!methods.includes(request.method)) return failure(405, "Method not allowed.");
  const headers = new Headers({ Accept: "application/json" });
  headers.set("Cookie", djangoCookies(request.headers.get("cookie")));
  let body: string | undefined;
  if (request.method !== "GET") {
    if (url.search) return failure(400, "Write queries are unsupported.");
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
  } else if (url.search) {
    const allowed =
      path === "/api/v1/transactions/" || path === "/api/v1/dashboard/"
        ? HISTORY_QUERY
        : path === "/api/v1/reports/trends/"
          ? new Set([...HISTORY_QUERY, "interval"])
          : path === "/api/v1/reports/breakdown/"
            ? new Set([...HISTORY_QUERY, "dimension"])
            : path === "/api/v1/funds/allocations/"
              ? new Set(["run", "transaction", "page"])
              : path.startsWith("/api/v1/funds/") || path === "/api/v1/reports/funds/"
                ? new Set(["run", "page"])
                : [
                      "/api/v1/accounts/",
                      "/api/v1/categories/",
                      "/api/v1/contacts/",
                      "/api/v1/claims/",
                      "/api/v1/loans/",
                      "/api/v1/settlements/",
                      "/api/v1/shared-bills/",
                      "/api/v1/rent/plans/",
                      "/api/v1/rent/obligations/",
                      "/api/v1/rent/payments/",
                      "/api/v1/rent/reserves/",
                    ].includes(path) ||
                    RELATIONSHIP_HISTORY.test(path) ||
                    (path.startsWith("/api/v1/rent/") &&
                      (path.endsWith("/history/") ||
                        path.endsWith("/obligations/") ||
                        path.endsWith("/payments/")))
                  ? new Set(["page"])
                  : new Set();
    if (
      url.search.length > 4096 ||
      [...url.searchParams.keys()].some(
        (key) => !allowed.has(key) || url.searchParams.getAll(key).length !== 1
      )
    )
      return failure(400, "Unsupported or repeated query parameters.");
    // Django validates the actual financial filter values and owner scope.
  }
  try {
    const upstream = await fetch(`${djangoOrigin()}${path}${url.search}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(upstreamTimeoutMs(path, request.method)),
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
      return failure(502, "The service returned an invalid response.");
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
