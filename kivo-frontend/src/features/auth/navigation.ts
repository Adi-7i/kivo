const PRIVATE_ROOTS = [
  "/dashboard",
  "/onboarding",
  "/settings",
  "/money",
  "/transactions",
  "/people",
  "/shared-expenses",
  "/rent",
  "/budgets",
  "/reports",
];

export function isProtectedPath(path: string): boolean {
  return PRIVATE_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));
}

/** Allow only known local application paths; reject protocol-relative/encoded redirects. */
export function safeReturnPath(value: string | null): string {
  if (
    !value ||
    /[\\\u0000-\u0020%]/.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return "/dashboard";
  const url = new URL(value, "https://kivo.invalid");
  return url.origin === "https://kivo.invalid" &&
    isProtectedPath(url.pathname) &&
    // The setup wizard is a gate, never a return destination (including query variants).
    url.pathname !== "/onboarding" &&
    !url.pathname.startsWith("/onboarding/")
    ? `${url.pathname}${url.search}`
    : "/dashboard";
}

/** Full navigation also discards the authenticated Next.js router/component caches. */
export function navigate(path: string): void {
  window.location.replace(path);
}
