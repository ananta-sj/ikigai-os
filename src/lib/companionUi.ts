import type { CompanionErrorPresentation } from './companion';

const DRAFT_KEY = 'ikigai:companion:draft';
const FAILURE_KEY = 'ikigai:companion:failure';
const RETRY_KEY = 'ikigai:companion:retry';
export const COMPANION_UI_EVENT = 'ikigai-companion-ui-changed';

export interface CompanionUiFailure {
  prompt: string;
  presentation: CompanionErrorPresentation;
  createdAt: string;
}

export interface CompanionUiRetry {
  nextAttempt: number;
  maxAttempts: number;
  retryAt: string;
  reason: 'rate-limit' | 'busy' | 'network' | 'timeout';
}

export interface CompanionUiState {
  draft: string;
  failure: CompanionUiFailure | null;
  retry: CompanionUiRetry | null;
}

function safeSessionGet(key: string) {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}

function safeSessionSet(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Draft sharing is convenience-only; never block the Companion if storage is unavailable.
  }
}

function readFailure(): CompanionUiFailure | null {
  const raw = safeSessionGet(FAILURE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CompanionUiFailure;
    if (!parsed?.prompt || !parsed.presentation?.title || !parsed.presentation?.detail) return null;
    return parsed;
  } catch {
    return null;
  }
}


let activeRetry: CompanionUiRetry | null = null;
function readRetry(): CompanionUiRetry | null {
  return activeRetry;
}

export function getCompanionUiState(): CompanionUiState {
  return {
    draft: safeSessionGet(DRAFT_KEY) ?? '',
    failure: readFailure(),
    retry: readRetry()
  };
}

function emit() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CompanionUiState>(COMPANION_UI_EVENT, { detail: getCompanionUiState() }));
}

export function setCompanionDraft(draft: string) {
  safeSessionSet(DRAFT_KEY, draft);
  emit();
}

export function setCompanionFailure(prompt: string, presentation: CompanionErrorPresentation) {
  const failure: CompanionUiFailure = { prompt, presentation, createdAt: new Date().toISOString() };
  safeSessionSet(FAILURE_KEY, JSON.stringify(failure));
  emit();
}

export function clearCompanionFailure() {
  safeSessionSet(FAILURE_KEY, null);
  emit();
}

export function setCompanionRetry(retry: CompanionUiRetry) {
  activeRetry = retry;
  safeSessionSet(RETRY_KEY, null);
  emit();
}

export function clearCompanionRetry() {
  activeRetry = null;
  safeSessionSet(RETRY_KEY, null);
  emit();
}

export function clearCompanionUi() {
  activeRetry = null;
  safeSessionSet(DRAFT_KEY, null);
  safeSessionSet(FAILURE_KEY, null);
  safeSessionSet(RETRY_KEY, null);
  emit();
}
