const configuredPublicAppUrl = process.env.EXPO_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ?? "";
const NATIVE_AUTH_CALLBACK_URL = "laburapp://auth/callback";
const NATIVE_RECOVERY_URL = "laburapp://recover-password";

function normalizedOrigin(value: string) {
  const parsed = new URL(value.trim());
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("INVALID_AUTH_REDIRECT");
  return parsed.origin;
}

function isLocalDevelopmentOrigin(origin: string) {
  const parsed = new URL(origin);
  return parsed.protocol === "http:"
    && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]");
}

export function publicAppUrl() {
  return configuredPublicAppUrl;
}

export function resolveWebAuthRedirect(configuredUrl: string, browserOrigin: string | undefined, isDevelopment: boolean) {
  if (configuredUrl) {
    const configuredOrigin = normalizedOrigin(configuredUrl);
    if (new URL(configuredOrigin).protocol !== "https:" && !(isDevelopment && isLocalDevelopmentOrigin(configuredOrigin))) {
      throw new Error("HTTPS_APP_URL_REQUIRED");
    }
    return configuredOrigin;
  }

  if (isDevelopment && browserOrigin) {
    const localOrigin = normalizedOrigin(browserOrigin);
    if (isLocalDevelopmentOrigin(localOrigin)) return localOrigin;
  }
  throw new Error("EXPO_PUBLIC_APP_URL_REQUIRED");
}

export function webAuthRedirectUrl(browserOrigin?: string) {
  return resolveWebAuthRedirect(configuredPublicAppUrl, browserOrigin, process.env.NODE_ENV !== "production");
}

export function nativeRecoveryRedirectUrl() {
  return NATIVE_RECOVERY_URL;
}

export function nativeAuthCallbackUrl() {
  return NATIVE_AUTH_CALLBACK_URL;
}

export function isAllowedNativeAuthCallbackUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "laburapp:"
      && parsed.hostname === "auth"
      && (parsed.pathname === "/callback" || parsed.pathname === "/callback/");
  } catch {
    return false;
  }
}

export function parseNativeAuthCallback(value: string) {
  if (!isAllowedNativeAuthCallbackUrl(value)) return null;
  const parsed = new URL(value);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  return {
    code: parsed.searchParams.get("code"),
    accessToken: fragment.get("access_token"),
    refreshToken: fragment.get("refresh_token"),
    error: fragment.get("error") ?? parsed.searchParams.get("error"),
  };
}

export function isAllowedNativeRecoveryUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "laburapp:"
      && parsed.hostname === "recover-password"
      && (parsed.pathname === "" || parsed.pathname === "/");
  } catch {
    return false;
  }
}

export function backendApiUrl(path: `/${string}`, isWeb: boolean) {
  if (isWeb) return path;
  if (!configuredPublicAppUrl) throw new Error("EXPO_PUBLIC_APP_URL_REQUIRED");
  return `${configuredPublicAppUrl}${path}`;
}
