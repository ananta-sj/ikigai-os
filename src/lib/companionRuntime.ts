export type ConnectionPhase = 'not-configured' | 'configured' | 'validating' | 'connected' | 'connecting' | 'sending' | 'receiving' | 'retrying' | 'rate-limited' | 'offline' | 'failed' | 'cancelled';
export interface CompanionRuntime { phase: ConnectionPhase; provider: string; model: string; startedAt?: number; retryAt?: number; characters: number; active: boolean; }
export const COMPANION_RUNTIME_EVENT = 'ikigai-companion-runtime';
let runtime: CompanionRuntime = { phase: 'not-configured', provider: 'AI', model: '', characters: 0, active: false };
let activeController: AbortController | null = null;
export function getCompanionRuntime() { return { ...runtime }; }
export function updateCompanionRuntime(patch: Partial<CompanionRuntime>) {
  runtime = { ...runtime, ...patch };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(COMPANION_RUNTIME_EVENT));
}
export function beginCompanionOperation(provider: string, model: string, phase: ConnectionPhase) {
  if (activeController) throw new Error('An AI request is already active. Wait or cancel it first.');
  activeController = new AbortController();
  updateCompanionRuntime({ provider, model, phase, active: true, startedAt: Date.now(), characters: 0, retryAt: undefined });
  return activeController;
}
export function finishCompanionOperation(controller: AbortController, phase: ConnectionPhase) {
  if (activeController !== controller) return;
  activeController = null;
  updateCompanionRuntime({ active: false, phase, retryAt: undefined });
}
export function cancelCompanionOperation() { activeController?.abort(); }
export function companionOperationActive() { return Boolean(activeController); }
export function providerLabel(provider: string, endpoint: string) {
  if (provider === 'ollama') return 'Ollama · local';
  try { return new URL(endpoint).hostname === 'generativelanguage.googleapis.com' ? 'Gemini · Google' : `Remote · ${new URL(endpoint).hostname}`; } catch { return 'Remote API'; }
}
