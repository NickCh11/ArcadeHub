function normalizeUrl(value: string | undefined, fallback: string) {
  const raw = (value ?? '').trim();
  const input = raw || fallback;

  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input.replace(/\/+$/, '');
  }

  if (input.startsWith('localhost') || input.startsWith('127.0.0.1')) {
    return `http://${input}`.replace(/\/+$/, '');
  }

  return `https://${input}`.replace(/\/+$/, '');
}

export function getSiteUrl() {
  if (typeof window !== 'undefined') {
    return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL, window.location.origin);
  }

  return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3000');
}

export function getAuthCallbackUrl() {
  return `${getSiteUrl()}/auth/callback`;
}

export function getBackendUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_BACKEND_URL, 'http://localhost:4000');
}
