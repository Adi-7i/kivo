import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { forwardDjango } from "@/lib/server/api-bridge";
import { proxy } from "@/proxy";

describe("same-origin API bridge (mocked upstream HTTP)", () => {
  it("forwards only Django cookies and preserves separate Set-Cookie headers", async () => {
    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append("Set-Cookie", "sessionid=opaque; Path=/; HttpOnly; SameSite=Lax; Secure");
    headers.append("Set-Cookie", "csrftoken=rotated; Path=/; SameSite=Lax; Secure");
    vi.mocked(fetch).mockResolvedValue(new Response('{"id":1}', { status: 200, headers }));
    const response = await forwardDjango(
      new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: '{"email":"test@example.test","password":"not-logged"}',
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
          Cookie: "other=private; sessionid=old; csrftoken=csrf",
          "X-CSRFToken": "csrf",
          "X-Forwarded-For": "spoof",
        },
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.getSetCookie()[0]).toContain("HttpOnly");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/api/v1/auth/login/");
    expect((init?.headers as Headers).get("Cookie")).toBe("sessionid=old; csrftoken=csrf");
    expect((init?.headers as Headers).get("Origin")).toBe("http://localhost:3000");
    expect((init?.headers as Headers).has("X-Forwarded-For")).toBe(false);
  });
  it("rejects cross-origin writes before upstream access", async () => {
    const response = await forwardDjango(
      new Request("https://kivo.example/api/v1/accounts/", {
        method: "POST",
        headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
        body: "{}",
      })
    );
    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("exposes no unapproved financial API operation", async () => {
    expect(
      (await forwardDjango(new Request("http://localhost:3000/api/v1/transactions/"))).status
    ).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps upstream outages distinct from an invalid session and never replays a write", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed with sensitive diagnostic"));
    const response = await forwardDjango(new Request("http://localhost:3000/api/v1/auth/me/"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("sensitive diagnostic");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("never relays a debug HTML response to the browser", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("private debug", { status: 500, headers: { "Content-Type": "text/html" } })
    );
    const response = await forwardDjango(new Request("http://localhost:3000/api/v1/auth/me/"));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private debug");
  });
});

describe("server route protection (mocked Django)", () => {
  it("redirects anonymous direct access with a local return path", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/settings/profile"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fsettings%2Fprofile"
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("checks opaque session cookies against Django instead of trusting their presence", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3000/dashboard", {
        headers: { Cookie: "sessionid=invalid" },
      })
    );
    expect(response.status).toBe(307);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("returns 503 on temporary outages without redirecting to login", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({}, { status: 503 }));
    const response = await proxy(
      new NextRequest("http://localhost:3000/dashboard", {
        headers: { Cookie: "sessionid=opaque" },
      })
    );
    expect(response.status).toBe(503);
    expect(response.headers.has("location")).toBe(false);
  });
});
