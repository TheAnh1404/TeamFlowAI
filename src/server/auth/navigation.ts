import "server-only";

const DEFAULT_AUTH_REDIRECT = "/app";

/**
 * Validates and sanitizes a 'next' redirect query parameter.
 * Strictly requires the target to be a safe relative subpath under '/app' or exactly '/app'.
 * Prevents open redirects, protocol-relative bypasses, backslashes, control characters,
 * and auth redirect loops.
 */
export function sanitizeNextPath(nextParam?: string | null): string {
  if (!nextParam || typeof nextParam !== "string") {
    return DEFAULT_AUTH_REDIRECT;
  }

  const raw = nextParam.trim();

  // Reject empty, control characters, or backslashes
  if (!raw || /[\u0000-\u001F\u007F\\]/.test(raw)) {
    return DEFAULT_AUTH_REDIRECT;
  }

  // Reject absolute URLs, protocol-relative URLs (starts with '//'), or scheme-like patterns
  if (raw.startsWith("//") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    return DEFAULT_AUTH_REDIRECT;
  }

  // Must start with '/'
  if (!raw.startsWith("/")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  // Try parsing path relative to dummy origin
  try {
    const dummyOrigin = "http://localhost";
    const parsed = new URL(raw, dummyOrigin);

    // Verify pathname is strictly '/app' or '/app/...'
    const pathname = parsed.pathname;
    if (pathname !== "/app" && !pathname.startsWith("/app/")) {
      return DEFAULT_AUTH_REDIRECT;
    }

    // Reject redirecting back to auth pages
    if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/api/")) {
      return DEFAULT_AUTH_REDIRECT;
    }

    // Reconstruct safe relative path + search query
    return pathname + parsed.search;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
