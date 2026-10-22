import { NextRequest, NextResponse } from "next/server";
import { djangoCookies, djangoOrigin, privateHeaders } from "@/lib/server/django";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const login = () => {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url, { headers: privateHeaders() });
  };
  if (!request.cookies.get("sessionid")?.value) return login();
  try {
    const response = await fetch(`${djangoOrigin()}/api/v1/auth/me/`, {
      headers: { Cookie: djangoCookies(request.headers.get("cookie")), Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    if (response.status === 401) return login();
    if (!response.ok) throw new Error("Session verification unavailable");
    const profile: unknown = await response.json();
    if (
      !profile ||
      typeof profile !== "object" ||
      !("id" in profile) ||
      typeof profile.id !== "number"
    ) {
      throw new Error("Invalid profile");
    }
    return NextResponse.next({ headers: privateHeaders() });
  } catch {
    return new NextResponse(
      "Session verification is temporarily unavailable. Please reload to try again.",
      {
        status: 503,
        headers: {
          ...Object.fromEntries(privateHeaders()),
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "5",
        },
      }
    );
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
    "/money/:path*",
    "/transactions/:path*",
    "/people/:path*",
    "/shared-expenses/:path*",
    "/rent/:path*",
    "/budgets/:path*",
    "/reports/:path*",
  ],
};
