import { db } from '../db';
import { probeBrowserStorage } from './security';

export type DiagnosticStatus = 'pass' | 'warn' | 'fail' | 'info';

export interface ProductDiagnosticItem {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
}

export interface ProductDiagnosticsReport {
  generatedAt: string;
  items: ProductDiagnosticItem[];
  summary: { pass: number; warn: number; fail: number; info: number };
  storage?: { usage?: number; quota?: number; persisted?: boolean };
}

function item(id: string, label: string, status: DiagnosticStatus, detail: string): ProductDiagnosticItem {
  return { id, label, status, detail };
}

function canUseWebGL() {
  if (typeof document === 'undefined') return { webgl2: false, webgl: false };
  try {
    const canvas = document.createElement('canvas');
    const webgl2 = Boolean(canvas.getContext('webgl2'));
    const webgl = webgl2 || Boolean(canvas.getContext('webgl'));
    return { webgl2, webgl };
  } catch {
    return { webgl2: false, webgl: false };
  }
}

export async function runProductDiagnostics(): Promise<ProductDiagnosticsReport> {
  const items: ProductDiagnosticItem[] = [];

  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false;
  items.push(item('secure-context', 'Secure browser context', secureContext ? 'pass' : 'warn', secureContext
    ? 'HTTPS/localhost security features are available.'
    : 'This page is not in a secure context. Some browser security and PWA features may be limited.'));

  const strongCrypto = typeof crypto !== 'undefined' && Boolean(crypto.subtle) && typeof crypto.randomUUID === 'function';
  items.push(item('web-crypto', 'Web Crypto', strongCrypto ? 'pass' : 'warn', strongCrypto
    ? 'SHA-256 checksums and strong browser-generated IDs are available.'
    : 'Strong Web Crypto is unavailable. Ikigai Space can still run, but security-sensitive browser primitives are reduced.'));

  let dbHealthy = false;
  try {
    await db.open();
    const tableCount = db.tables.length;
    dbHealthy = tableCount >= 20;
    items.push(item('indexeddb', 'Local database', dbHealthy ? 'pass' : 'warn', `IndexedDB opened with ${tableCount} Ikigai Space tables.`));
  } catch (error) {
    items.push(item('indexeddb', 'Local database', 'fail', error instanceof Error ? error.message : 'IndexedDB could not be opened.'));
  }

  const sessionOk = probeBrowserStorage('session');
  const localOk = probeBrowserStorage('local');
  items.push(item('session-storage', 'Session storage', sessionOk ? 'pass' : 'warn', sessionOk
    ? 'Tab-scoped Companion drafts and session-only keys can be stored.'
    : 'Session storage is blocked; Companion continuity may be reduced.'));
  items.push(item('local-storage', 'Device storage', localOk ? 'pass' : 'warn', localOk
    ? 'Optional device-level preferences and trusted-endpoint decisions can persist.'
    : 'Local storage is blocked; remembered API keys and endpoint trust cannot persist.'));

  const { webgl2, webgl } = canUseWebGL();
  items.push(item('webgl', 'Sanctuary 3D', webgl ? (webgl2 ? 'pass' : 'warn') : 'warn', webgl2
    ? 'WebGL 2 is available.'
    : webgl
      ? 'WebGL is available, but WebGL 2 is not. Sanctuary may use a reduced rendering path.'
      : 'WebGL is unavailable. Sanctuary should fall back instead of showing a broken canvas.'));

  const AudioContextCtor = typeof window !== 'undefined'
    ? (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    : undefined;
  items.push(item('web-audio', 'Local audio', AudioContextCtor ? 'pass' : 'info', AudioContextCtor
    ? 'Optional local interaction tones and soundscapes are supported.'
    : 'Web Audio is unavailable; sound remains optional and the rest of Ikigai Space is unaffected.'));

  const swSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  let swDetail = swSupported ? 'Service workers are supported but this page is not currently controlled.' : 'Service workers are not supported in this browser.';
  let swStatus: DiagnosticStatus = swSupported ? 'info' : 'warn';
  if (swSupported) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (navigator.serviceWorker.controller) {
        swStatus = 'pass';
        swDetail = 'The installed/offline shell is controlled by a service worker.';
      } else if (registration) {
        swStatus = 'info';
        swDetail = 'A service worker is registered and may take control after reload.';
      }
    } catch {
      swStatus = 'warn';
      swDetail = 'The browser supports service workers, but Ikigai Space could not inspect the current registration.';
    }
  }
  items.push(item('service-worker', 'Offline shell', swStatus, swDetail));

  let storage: ProductDiagnosticsReport['storage'];
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : undefined;
      storage = { usage: estimate.usage, quota: estimate.quota, persisted };
      const ratio = estimate.quota && estimate.usage ? estimate.usage / estimate.quota : 0;
      items.push(item('storage-quota', 'Browser storage headroom', ratio > 0.85 ? 'warn' : 'pass', estimate.quota
        ? `${Math.round(ratio * 100)}% of the browser-reported storage quota is currently in use${persisted === true ? ' · persistent storage granted' : persisted === false ? ' · storage may be evicted under device pressure' : ''}.`
        : 'The browser did not report a storage quota.'));
    } catch {
      items.push(item('storage-quota', 'Browser storage headroom', 'info', 'The browser did not provide storage estimates.'));
    }
  } else {
    items.push(item('storage-quota', 'Browser storage headroom', 'info', 'Storage quota reporting is not supported here.'));
  }

  if (typeof navigator !== 'undefined') {
    items.push(item('network-state', 'Current network state', navigator.onLine ? 'info' : 'info', navigator.onLine
      ? 'Browser reports online. Ikigai Space remains local-first; only explicitly connected services use the network.'
      : 'Browser reports offline. Local rooms should remain usable; remote AI and future connected services will not.'));
  }

  const summary = { pass: 0, warn: 0, fail: 0, info: 0 };
  for (const row of items) summary[row.status] += 1;
  return { generatedAt: new Date().toISOString(), items, summary, storage };
}
