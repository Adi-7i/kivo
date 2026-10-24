/** Server-only transport configuration. Never import this module in client components. */
export function djangoOrigin(): string {
  const raw = process.env.DJANGO_API_ORIGIN || "http://127.0.0.1:8000";
  const url = new URL(raw);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol) ||
    (url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  ) {
    throw new Error("DJANGO_API_ORIGIN must be an HTTPS origin or a loopback HTTP origin.");
  }
  return url.origin;
}

export function djangoCookies(cookie: string | null): string {
  return (cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => /^(sessionid|csrftoken)=/.test(part))
    .join("; ");
}

export function privateHeaders(): Headers {
  return new Headers({ "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" });
}
