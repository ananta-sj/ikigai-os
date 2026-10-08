const COMPANION_TRUSTED_ORIGINS_KEY = 'ikigai-companion-trusted-origins-v1';

const knownCompanionOrigins = new Set([
  'https://generativelanguage.googleapis.com'
]);

export interface EndpointTrustInfo {
  valid: boolean;
  normalized?: string;
  origin?: string;
  hostname?: string;
  known: boolean;
  trusted: boolean;
  requiresTrust: boolean;
  reason?: string;
}

export function normalizeExternalHttpUrl(raw?: string | null): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function safeExternalHref(raw?: string | null): string | undefined {
  return normalizeExternalHttpUrl(raw);
}

export function safeFilename(raw?: string | null, fallback = 'file'): string {
  const cleaned = (raw ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return cleaned || fallback;
}

export function isLoopbackHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function readTrustedOrigins(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(COMPANION_TRUSTED_ORIGINS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return new Set();
  }
}

function writeTrustedOrigins(origins: Set<string>) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(COMPANION_TRUSTED_ORIGINS_KEY, JSON.stringify([...origins].sort()));
    return true;
  } catch {
    return false;
  }
}

export function companionEndpointTrustInfo(raw: string): EndpointTrustInfo {
  const value = raw.trim();
  if (!value) return { valid: false, known: false, trusted: false, requiresTrust: false, reason: 'Enter an endpoint.' };
  try {
    const url = new URL(value);
    const loopback = isLoopbackHost(url.hostname);
    if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) {
      return { valid: false, known: false, trusted: false, requiresTrust: false, reason: 'Remote endpoints must use HTTPS. Localhost may use HTTP.' };
    }
    if (url.username || url.password) {
      return { valid: false, known: false, trusted: false, requiresTrust: false, reason: 'Do not put credentials in the endpoint URL.' };
    }
    const sensitiveQueryName = [...url.searchParams.keys()].find(name => /^(?:api[-_]?key|key|access[-_]?token|token|auth(?:orization)?|password|secret)$/i.test(name));
    if (sensitiveQueryName) {
      return { valid: false, known: false, trusted: false, requiresTrust: false, reason: 'Keep API keys and tokens out of the endpoint URL. Use the API key field instead.' };
    }
    url.hash = '';
    const origin = url.origin;
    const known = loopback || knownCompanionOrigins.has(origin);
    const trusted = known || readTrustedOrigins().has(origin);
    return {
      valid: true,
      normalized: url.toString(),
      origin,
      hostname: url.hostname,
      known,
      trusted,
      requiresTrust: !known
    };
  } catch {
    return { valid: false, known: false, trusted: false, requiresTrust: false, reason: 'That endpoint is not a valid URL.' };
  }
}

export function trustCompanionEndpoint(raw: string): EndpointTrustInfo {
  const info = companionEndpointTrustInfo(raw);
  if (!info.valid || !info.origin) return info;
  if (info.known) return info;
  const origins = readTrustedOrigins();
  origins.add(info.origin);
  if (!writeTrustedOrigins(origins)) {
    return { ...info, trusted: false, reason: 'Browser storage blocked the trust decision. Ikigai Space will not send an API key to this endpoint.' };
  }
  return { ...info, trusted: true };
}

export function forgetCompanionEndpointTrust(raw: string): EndpointTrustInfo {
  const info = companionEndpointTrustInfo(raw);
  if (!info.valid || !info.origin || info.known) return info;
  const origins = readTrustedOrigins();
  origins.delete(info.origin);
  writeTrustedOrigins(origins);
  return { ...info, trusted: false };
}

export function clearCompanionEndpointTrusts() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(COMPANION_TRUSTED_ORIGINS_KEY); } catch { /* best-effort reset */ }
}

export function assertCompanionEndpointTrusted(raw: string): EndpointTrustInfo {
  const info = companionEndpointTrustInfo(raw);
  if (!info.valid) throw new Error(info.reason || 'The model endpoint is not valid.');
  if (info.requiresTrust && !info.trusted) {
    throw new Error(`Trust ${info.hostname ?? 'this endpoint'} in AI settings before Ikigai Space sends an API key there.`);
  }
  return info;
}

export function probeBrowserStorage(kind: 'session' | 'local'): boolean {
  if (typeof window === 'undefined') return false;
  const storage = kind === 'session' ? window.sessionStorage : window.localStorage;
  const key = `__ikigai_probe_${kind}__`;
  try {
    storage.setItem(key, '1');
    const ok = storage.getItem(key) === '1';
    storage.removeItem(key);
    return ok;
  } catch {
    try { storage.removeItem(key); } catch { /* ignore */ }
    return false;
  }
}

/**
 * Small non-sensitive UI markers may share the audited browser-storage boundary.
 * This is intentionally not a general secret store and only accepts Ikigai Space keys.
 */
export function readLocalUiMarker(key: string): string | null {
  if (typeof window === 'undefined' || !key.startsWith('ikigai.')) return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writeLocalUiMarker(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !key.startsWith('ikigai.') || value.length > 256) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
