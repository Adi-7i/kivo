/**
 * Retrieves the Django CSRF token from document.cookie if running in browser.
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match && match[1] ? decodeURIComponent(match[1]) : null;
}
