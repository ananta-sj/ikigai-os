import { CompanionConnectionStatus, useCompanionRuntime } from '../components/companion/CompanionConnectionStatus';
import { companionOperationActive, getCompanionRuntime, providerLabel, updateCompanionRuntime } from '../lib/companionRuntime';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  CircleOff,
  Cloud,
  Eraser,
  KeyRound,
  Laptop,
  LoaderCircle,
  MessageCircle,
  Palette,
  RefreshCw,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  WifiOff,
  X
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { FamiliarAvatar } from '../components/familiar/FamiliarAvatar';
import { CompanionDocumentTray, useCompanionDocumentsBusy } from '../components/companion/CompanionDocumentTray';
import { IkButton } from '../components/ui/IkButton';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  applyCompanionProposal,
  clearCompanionConversation,
  companionApiKeyRemembered,
  companionContextSummary,
  companionErrorPresentation,
  companionPrivacyNote,
  companionScopeLabels,
  companionEndpointTrustInfo,
  configureRemoteApi,
  discoverOllamaModels,
  discoverGeminiModels,
  dismissCompanionProposal,
  ensureCompanionState,
  hasCompanionApiKey,
  listCompanionMessages,
  sendCompanionMessage,
  setCompanionApiKey,
  switchCompanionProvider,
  testRemoteApiConnection,
  trustCompanionEndpoint,
  forgetCompanionEndpointTrust,
  updateCompanionState
} from '../lib/companion';
import {
  clearCompanionFailure,
  COMPANION_UI_EVENT,
  getCompanionUiState,
  setCompanionDraft,
  setCompanionFailure,
  type CompanionUiRetry,
  type CompanionUiState
} from '../lib/companionUi';
import { ensureSettings, updateSettings } from '../lib/settings';
import { familiarPresenceCopy, openFamiliar } from '../lib/familiar';
import { clearCompanionDocuments, companionDocumentsForRequest } from '../lib/companionDocuments';
import type {
  CompanionMessage,
  CompanionProposal,
  CompanionProvider,
  CompanionState,
  FamiliarActivity,
  FamiliarColor,
  FamiliarDesign,
  FamiliarTheme,
  FamiliarSide,
  UserSettings
} from '../types';
import type { CompanionErrorPresentation } from '../lib/companion';
import '../companion-v120.css';

interface ContextSummary {
  today: number;
  overdue: number;
  upcoming: number;
  milestones: number;
  phase?: string;
  mode?: string;
  roadmapPhases: number;
  opportunities: number;
}

type CompanionView = 'familiar' | 'connection' | 'chat';
type RemotePreset = 'gemini' | 'custom';

const GEMINI_CHAT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const quickPrompts = [
  'Build a realistic plan for the next month with roadmap phases and tasks.',
  'Lighten my next three days without losing the important work.',
  'Look at my roadmap and tell me what is missing or overloaded.',
  'Use the attached roadmap or CV as source material and draft only the changes it supports.'
];

const familiarDesigns: Array<{ value: FamiliarDesign; label: string; note: string }> = [
  { value: 'sprout', label: 'Sprout', note: 'Leafy, curious, original Familiar' },
  { value: 'wisp', label: 'Wisp', note: 'Rounder spirit with lighter edges' },
  { value: 'mossling', label: 'Mossling', note: 'Grounded, soft and a little sturdier' }
];

const familiarColors: Array<{ value: FamiliarColor; label: string }> = [
  { value: 'mint', label: 'Mint' },
  { value: 'sakura', label: 'Sakura' },
  { value: 'amber', label: 'Amber' },
  { value: 'lunar', label: 'Lunar' }
];

const familiarThemes: Array<{ value: FamiliarTheme; label: string; note: string }> = [
  { value: 'natural', label: 'Ceramic', note: 'Opaque satin glaze · clean highlights · crafted feel' },
  { value: 'terracotta', label: 'Terracotta', note: 'Warm fired clay · earthy grain · softly worn edges' },
  { value: 'moss', label: 'Moss', note: 'Dense organic surface · velvety texture · grounded glow' },
  { value: 'dream', label: 'Moonstone', note: 'Opaque pearlescent shell · luminous core · cool sheen' },
  { value: 'minimal', label: 'Ink clay', note: 'Deep matte shell · restrained detail · graphic silhouette' }
];

const familiarActivities: Array<{ value: FamiliarActivity; label: string; note: string }> = [
  { value: 'still', label: 'Quiet', note: 'Minimal autonomous motion; interactions still work' },
  { value: 'calm', label: 'Nearby', note: 'Calm default with occasional bounded reactions' },
  { value: 'lively', label: 'Playful', note: 'More expressive idle movement inside the nook' },
  { value: 'hidden', label: 'Home only', note: 'Visible in Companion and as the Sanctuary resident' }
];

function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function proposalDetail(proposal: CompanionProposal) {
  if (proposal.kind === 'move-task') return `${proposal.fromDate ?? 'Backlog'} → ${proposal.toDate}`;
  if (proposal.kind === 'unschedule-task') return `${proposal.fromDate ?? 'Scheduled'} → Backlog`;
  if (proposal.kind === 'create-roadmap-phase' && proposal.newPhase) return `${proposal.newPhase.startDate} → ${proposal.newPhase.endDate} · ${proposal.newPhase.mode}`;
  if (proposal.kind === 'create-roadmap-item' && proposal.newRoadmapItem) return [proposal.newRoadmapItem.lane, proposal.newRoadmapItem.targetDate].filter(Boolean).join(' · ');
  if (proposal.kind === 'create-career-project' && proposal.newCareerProject) return [proposal.newCareerProject.status, proposal.newCareerProject.targetDate].filter(Boolean).join(' · ');
  if (proposal.kind === 'create-proof-item' && proposal.newProofItem) return [proposal.newProofItem.kind, proposal.newProofItem.date].filter(Boolean).join(' · ');
  if (proposal.newTask) return [proposal.newTask.category, proposal.newTask.difficulty, proposal.newTask.dueDate].filter(Boolean).join(' · ');
  return '';
}

function ProposalCard({ messageId, proposal, checked, onToggle, onChanged }: {
  messageId: string;
  proposal: CompanionProposal;
  checked: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const pending = proposal.status === 'pending';

  async function apply() {
    setBusy(true);
    setActionError('');
    try {
    await applyCompanionProposal(messageId, proposal.id);
    await onChanged();
    } catch (error) { setActionError(companionErrorPresentation(error).detail); }
    finally { setBusy(false); }
  }

  async function dismiss() {
    setBusy(true);
    setActionError('');
    try {
    await dismissCompanionProposal(messageId, proposal.id);
    await onChanged();
    } catch (error) { setActionError(companionErrorPresentation(error).detail); }
    finally { setBusy(false); }
  }

  return (
    <article className={`companion-proposal status-${proposal.status}`}>
      <label className="companion-proposal-select">
        <input type="checkbox" checked={checked} disabled={!pending || busy} onChange={onToggle} />
        <span aria-hidden="true"><Check size={12} /></span>
      </label>
      <div className="companion-proposal-copy">
        <div className="companion-proposal-title-row">
          <strong>{proposal.title}</strong>
          <small>{proposal.status === 'applied' ? 'APPLIED' : proposal.status === 'dismissed' ? 'DISMISSED' : proposal.status === 'failed' ? 'FAILED' : proposal.kind.replaceAll('-', ' ').toUpperCase()}</small>
        </div>
        <p>{proposal.reason}</p>
        <span>{proposalDetail(proposal)}</span>
        {proposal.error ? <em>{proposal.error}</em> : null}
        {actionError ? <em role="alert">{actionError}</em> : null}
      </div>
      {pending ? (
        <div className="companion-proposal-actions">
          <button type="button" className="companion-proposal-apply" onClick={() => void apply()} disabled={busy} aria-label={`Apply ${proposal.title}`}>
            {busy ? <LoaderCircle size={13} className="spin" /> : <Check size={13} />} Apply
          </button>
          <button type="button" className="companion-proposal-dismiss" onClick={() => void dismiss()} disabled={busy} aria-label="Dismiss proposal"><X size={14} /></button>
        </div>
      ) : null}
    </article>
  );
}

function TranscriptMessage({ message, selected, setSelected, onChanged }: {
  message: CompanionMessage;
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  onChanged: () => Promise<void>;
}) {
  const pending = message.proposals?.filter(proposal => proposal.status === 'pending') ?? [];
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  async function applySelected() {
    const ids = pending.filter(proposal => selected.has(proposal.id)).map(proposal => proposal.id);
    if (!ids.length) return;
    setApplying(true);
    setApplyError('');
    try {
    for (const id of ids) await applyCompanionProposal(message.id, id);
    const next = new Set(selected);
    ids.forEach(id => next.delete(id));
    setSelected(next);
    await onChanged();
    } catch (error) { setApplyError(companionErrorPresentation(error).detail); }
    finally { setApplying(false); }
  }

  if (message.role === 'user') {
    return (
      <article className="companion-message companion-message-user">
        <div className="companion-message-meta"><span>YOU</span><time>{formatTime(message.createdAt)}</time></div>
        <p>{message.content}</p>
      </article>
    );
  }

  return (
    <article className="companion-message companion-message-assistant">
      <div className="companion-message-meta"><span><Sparkles size={12} /> COMPANION</span><time>{formatTime(message.createdAt)}{message.model ? ` · ${message.model}` : ''}</time></div>
      <p>{message.content}</p>
      {applyError ? <p role="alert">{applyError}</p> : null}
      {message.proposals?.length ? (
        <section className="companion-proposals">
          <div className="companion-proposals-head">
            <div><span className="ik-section-kicker">PROPOSED CHANGES</span><small>Nothing changes until you approve it.</small></div>
            {pending.length ? <IkButton size="sm" variant="primary" onClick={() => void applySelected()} disabled={applying || !pending.some(proposal => selected.has(proposal.id))}>{applying ? <LoaderCircle size={13} className="spin" /> : <Check size={13} />} Apply selected</IkButton> : null}
          </div>
          {message.proposals.map(proposal => (
            <ProposalCard key={proposal.id} messageId={message.id} proposal={proposal} checked={selected.has(proposal.id)} onToggle={() => {
              const next = new Set(selected);
              if (next.has(proposal.id)) next.delete(proposal.id); else next.add(proposal.id);
              setSelected(next);
            }} onChanged={onChanged} />
          ))}
        </section>
      ) : null}
    </article>
  );
}

export function CompanionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const activeView: CompanionView = requestedView === 'connection' || requestedView === 'chat' ? requestedView : 'familiar';
  const initialUi = useMemo(() => getCompanionUiState(), []);
  const [state, setState] = useState<CompanionState | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [familiarNameDraft, setFamiliarNameDraft] = useState('Familiar');
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const GEMINI_MODEL_OPTIONS = geminiModels.map(value => ({ value, label: value, note: 'Available from Google · test this connection' }));
  const [connection, setConnection] = useState<'checking' | 'online' | 'offline'>('checking');
  const [connectionError, setConnectionError] = useState('');
  const [endpointDraft, setEndpointDraft] = useState('http://localhost:11434');
  const [modelDraft, setModelDraft] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [rememberApiKey, setRememberApiKey] = useState(() => companionApiKeyRemembered());
  const [endpointTrustRevision, setEndpointTrustRevision] = useState(0);
  const [prompt, setPromptState] = useState(initialUi.draft);
  const [localSending, setSending] = useState(false);
  const runtime = useCompanionRuntime();
  const readingDocuments = useCompanionDocumentsBusy();
  const sending = localSending || runtime.active || readingDocuments;
  const [requestError, setRequestError] = useState<CompanionErrorPresentation | null>(initialUi.failure?.presentation ?? null);
  const [failedPrompt, setFailedPrompt] = useState(initialUi.failure?.prompt ?? '');
  const [retry, setRetry] = useState<CompanionUiRetry | null>(initialUi.retry);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ContextSummary | null>(null);
  const transcriptEnd = useRef<HTMLDivElement | null>(null);
  const { confirm, confirmDialog } = useConfirmDialog();

  function changeView(view: CompanionView) {
    const next = new URLSearchParams(searchParams);
    if (view === 'familiar') next.delete('view');
    else next.set('view', view);
    setSearchParams(next, { replace: true });
  }

  function updatePrompt(next: string) {
    setPromptState(next);
    setCompanionDraft(next);
    if (failedPrompt && next.trim() !== failedPrompt.trim()) clearCompanionFailure();
  }

  async function refreshMessages() {
    const next = await listCompanionMessages();
    setMessages(next);
    const pendingIds = next.flatMap(message => message.proposals ?? []).filter(proposal => proposal.status === 'pending').map(proposal => proposal.id);
    setSelected(current => {
      const pendingSet = new Set(pendingIds);
      const nextSet = new Set([...current].filter(id => pendingSet.has(id)));
      pendingIds.forEach(id => nextSet.add(id));
      return nextSet;
    });
  }

  async function refreshSummary(scope: CompanionState['contextScope']) {
    setSummary(await companionContextSummary(scope));
  }

  async function connectOllama(endpoint = endpointDraft) {
    if (companionOperationActive()) return;
    setConnection('checking');
    setConnectionError('');
    try {
      const result = await discoverOllamaModels(endpoint);
      const next = await ensureCompanionState();
      setState(next);
      setEndpointDraft(result.endpoint);
      setModelDraft(next.model);
      setModels(result.models);
      setConnection('online');
      if (!result.models.length) setConnectionError('Ollama is running, but no local models are installed yet.');
    } catch (error) {
      setConnection('offline');
      setModels([]);
      const presentation = companionErrorPresentation(error);
      setConnectionError(`${presentation.title}: ${presentation.detail}`);
    }
  }

  function chooseRemotePreset(preset: RemotePreset) {
    setConnection('offline');
    setConnectionError('');
    if (preset === 'gemini') {
      setEndpointDraft(GEMINI_CHAT_ENDPOINT);
      if (!modelDraft.startsWith('gemini-')) setModelDraft('');
      return;
    }
    if (endpointDraft === GEMINI_CHAT_ENDPOINT) setEndpointDraft('');
    if (GEMINI_MODEL_OPTIONS.some(option => option.value === modelDraft)) setModelDraft('');
  }

  function trustRemoteEndpoint() {
    const info = trustCompanionEndpoint(endpointDraft);
    setEndpointTrustRevision(value => value + 1);
    setConnectionError(info.trusted ? `Trusted ${info.hostname ?? 'this endpoint'} on this device.` : (info.reason ?? 'Ikigai Space could not store that trust decision.'));
  }

  function forgetRemoteEndpointTrust() {
    const info = forgetCompanionEndpointTrust(endpointDraft);
    setEndpointTrustRevision(value => value + 1);
    setConnection('offline');
    setConnectionError(info.known ? '' : `Trust removed for ${info.hostname ?? 'this endpoint'}.`);
  }

  async function saveRemoteApi() {
    setConnection('checking');
    setConnectionError('');
    try {
      if (companionOperationActive()) return;
      let next = await configureRemoteApi({ endpoint: endpointDraft, model: modelDraft || (endpointDraft === GEMINI_CHAT_ENDPOINT ? 'gemini-selection-pending' : ''), apiKey: apiKeyDraft, rememberApiKey });
      if (endpointDraft === GEMINI_CHAT_ENDPOINT) {
        const available = await discoverGeminiModels();
        setGeminiModels(available);
        if (!modelDraft) { next = await updateCompanionState({ model: available[0], lastConnectedAt: undefined }); setModelDraft(next.model); }
        else if (!available.includes(modelDraft)) {
          setState(next); setApiKeyDraft(''); setConnection('offline');
          setConnectionError('This saved model is not in Google’s available model list. Choose a returned model, then Save & test.');
          return;
        }
      }
      setState(next);
      setEndpointDraft(next.endpoint);
      setApiKeyDraft('');
      await testRemoteApiConnection({ endpoint: next.endpoint, model: next.model });
      setConnection('online');
      setState(await ensureCompanionState());
      setConnectionError('Connection tested successfully.');
    } catch (error) {
      setConnection('offline');
      const presentation = companionErrorPresentation(error);
      setConnectionError(`${presentation.title}: ${presentation.detail}`);
    }
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [current, currentSettings] = await Promise.all([ensureCompanionState(), ensureSettings()]);
      if (!alive) return;
      setState(current);
      setSettings(currentSettings);
      setFamiliarNameDraft(currentSettings.familiarName || 'Familiar');
      setEndpointDraft(current.endpoint);
      setModelDraft(current.model);
      setRememberApiKey(companionApiKeyRemembered());
      await Promise.all([refreshMessages(), refreshSummary(current.contextScope)]);
      if (!alive) return;
      if (current.provider === 'ollama') await connectOllama(current.endpoint);
      else {
        const configured = Boolean(current.model && current.endpoint && hasCompanionApiKey());
        setConnection(configured ? 'online' : 'offline');
        const runtime = getCompanionRuntime();
        const provider = providerLabel(current.provider, current.endpoint);
        if (!runtime.active && (runtime.provider !== provider || runtime.model !== current.model || runtime.phase === 'not-configured')) updateCompanionRuntime({ provider, model: current.model, phase: configured ? 'configured' : 'not-configured' });
      }
    })();
    return () => { alive = false; };
    // Intentional one-time bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uiListener = (event: Event) => {
      const next = (event as CustomEvent<CompanionUiState>).detail ?? getCompanionUiState();
      setPromptState(next.draft);
      setRequestError(next.failure?.presentation ?? null);
      setFailedPrompt(next.failure?.prompt ?? '');
      setRetry(next.retry);
    };
    const settingsListener = (event: Event) => {
      const next = (event as CustomEvent<UserSettings>).detail;
      if (next) { setSettings(next); setFamiliarNameDraft(next.familiarName || 'Familiar'); }
    };
    const companionListener = () => {
      void refreshMessages();
      if (state) void refreshSummary(state.contextScope);
    };
    window.addEventListener(COMPANION_UI_EVENT, uiListener);
    window.addEventListener('ikigai-settings-changed', settingsListener);
    window.addEventListener('ikigai-companion-changed', companionListener);
    return () => {
      window.removeEventListener(COMPANION_UI_EVENT, uiListener);
      window.removeEventListener('ikigai-settings-changed', settingsListener);
      window.removeEventListener('ikigai-companion-changed', companionListener);
    };
  }, [state]);

  useEffect(() => {
    if (activeView !== 'chat' || !messages.length) return;
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeView]);

  const pendingCount = useMemo(() => messages.flatMap(message => message.proposals ?? []).filter(proposal => proposal.status === 'pending').length, [messages]);
  const providerReady = Boolean(state?.model) && connection === 'online';
  const connectionIndicator = runtime.active ? 'checking' : runtime.phase === 'connected' ? 'online' : 'offline';
  const isGeminiRemote = endpointDraft === GEMINI_CHAT_ENDPOINT;
  const geminiModelPreset = GEMINI_MODEL_OPTIONS.some(option => option.value === modelDraft) ? modelDraft : '__custom__';
  const endpointTrust = useMemo(() => companionEndpointTrustInfo(endpointDraft), [endpointDraft, endpointTrustRevision]);

  async function changeProvider(provider: CompanionProvider) {
    const next = await switchCompanionProvider(provider);
    setState(next);
    setModels([]);
    setEndpointDraft(next.endpoint);
    setModelDraft('');
    setConnectionError('');
    if (provider === 'ollama') {
      setConnection('checking');
      await connectOllama(next.endpoint);
    } else {
      setConnection('offline');
    }
  }

  async function changeModel(model: string) {
    const next = await updateCompanionState({ model });
    setState(next);
    setModelDraft(model);
  }

  async function changeScope(scope: CompanionState['contextScope']) {
    const next = await updateCompanionState({ contextScope: scope });
    setState(next);
    await refreshSummary(scope);
  }

  async function patchFamiliar(patch: Partial<Pick<UserSettings, 'familiarEnabled' | 'familiarActivity' | 'familiarDesign' | 'familiarColor' | 'familiarTheme' | 'familiarName' | 'familiarSide' | 'familiarPosition' | 'familiarReactions' | 'familiarSounds' | 'familiarContextHints' | 'familiarPlay'>>) {
    const next = await updateSettings(patch);
    setSettings(next);
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || companionOperationActive() || sending || retry) return;
    setSending(true);
    setConnectionError('');
    clearCompanionFailure();
    try {
      await sendCompanionMessage(trimmed, companionDocumentsForRequest());
      clearCompanionDocuments();
      setCompanionDraft('');
      clearCompanionFailure();
      await Promise.all([refreshMessages(), state ? refreshSummary(state.contextScope) : Promise.resolve()]);
    } catch (error) {
      const presentation = companionErrorPresentation(error);
      setCompanionDraft(trimmed);
      setCompanionFailure(trimmed, presentation);
    } finally {
      setSending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendText(prompt);
  }

  async function clearConversation() {
    if (!messages.length || !(await confirm({ title: 'Clear conversation?', message: 'Clear the local companion conversation? Applied changes will remain.', confirmLabel: 'Clear conversation', tone: 'danger' }))) return;
    await clearCompanionConversation();
    setMessages([]);
    setSelected(new Set());
  }

  return (
    <div className="page companion-page">
      <div className="ik-page-width">
        <PageHeader
          eyebrow={<><Sparkles size={12} /> COMPANION · AGENT</>}
          title="A quiet companion that lives across Ikigai Space."
          description="The Familiar is a local character first: presence, context and small play. AI conversation is optional, documents stay ephemeral unless you approve extracted records, and every proposed write still waits for your approval."
          actions={activeView === 'chat' ? <IkButton variant="quiet" size="sm" onClick={() => void clearConversation()} disabled={sending || !messages.length}><Eraser size={13} /> Clear conversation</IkButton> : undefined}
          meta={<><span>{state?.provider === 'api' ? 'REMOTE API' : 'LOCAL OLLAMA'}</span><span>·</span><span>{pendingCount} pending proposal{pendingCount === 1 ? '' : 's'}</span></>}
        />

        <nav className="companion-subnav" aria-label="Companion sections">
          <button type="button" className={activeView === 'familiar' ? 'active' : ''} onClick={() => changeView('familiar')}>
            <Palette size={15} /><span><strong>Familiar</strong><small>identity · presence · play</small></span>
          </button>
          <button type="button" className={activeView === 'connection' ? 'active' : ''} onClick={() => changeView('connection')}>
            <Settings2 size={15} /><span><strong>AI settings</strong><small>API · endpoint · Ollama</small></span><i className={`companion-connection-dot ${connectionIndicator}`} />
          </button>
          <button type="button" className={activeView === 'chat' ? 'active' : ''} onClick={() => changeView('chat')}>
            <MessageCircle size={15} /><span><strong>Chat history</strong><small>conversation · proposals</small></span>{pendingCount ? <b>{pendingCount}</b> : null}
          </button>
        </nav>

        <CompanionConnectionStatus />

        {activeView === 'familiar' ? (
          <section className="companion-familiar-home" aria-label="Familiar identity and presence">
            <aside className="companion-familiar-preview">
              <span className="ik-section-kicker">FAMILIAR · IDENTITY</span>
              <div className="companion-familiar-stage">
                <FamiliarAvatar
                  design={settings?.familiarDesign}
                  color={settings?.familiarColor}
                  theme={settings?.familiarTheme}
                  pose={settings?.familiarActivity === 'still' ? 'rest' : 'curious'}
                  size="xl"
                />
              </div>
              <div className="companion-familiar-preview-copy">
                <h2>{settings?.familiarName || 'Familiar'}</h2>
                <p>A resident of Ikigai Space, not a chatbot costume. It can stay nearby, offer local room context, play in small ways and carry you into conversation when you ask.</p>
              </div>
              <div className="companion-familiar-facts">
                <span>{settings?.familiarEnabled === false ? 'Disabled' : `${familiarPresenceCopy(settings?.familiarActivity ?? 'calm').label} presence`}</span>
                <span>{settings?.familiarPosition ? 'Free placement' : settings?.familiarSide === 'left' ? 'Left nook' : 'Right nook'}</span>
                <span>{providerReady ? 'Conversation ready' : 'Conversation optional'}</span>
              </div>
              <div className="companion-familiar-preview-actions">
                <button type="button" disabled={settings?.familiarEnabled === false} onClick={() => openFamiliar('together')}>{settings?.familiarEnabled === false ? 'Familiar disabled' : 'Open Together panel'}</button>
                <button type="button" disabled={settings?.familiarEnabled === false} onClick={() => openFamiliar('talk')}>Open Talk</button>
              </div>
            </aside>

            <div className="companion-familiar-editor">
              <section className="companion-familiar-editor-block">
                <div className="companion-customize-heading"><span><Sparkles size={14} /> Identity</span><small>One character across pages and Sanctuary</small></div>
                <label className="companion-field-label companion-familiar-name">Name
                  <input
                    value={familiarNameDraft}
                    maxLength={28}
                    onChange={event => setFamiliarNameDraft(event.target.value)}
                    onBlur={() => void patchFamiliar({ familiarName: familiarNameDraft.trim() || 'Familiar' })}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    placeholder="Familiar"
                  />
                </label>

                <div className="companion-design-options" role="radiogroup" aria-label="Familiar form">
                  {familiarDesigns.map(option => (
                    <button key={option.value} type="button" role="radio" aria-checked={settings?.familiarDesign === option.value} className={settings?.familiarDesign === option.value ? `active design-${option.value}` : `design-${option.value}`} onClick={() => void patchFamiliar({ familiarDesign: option.value })}>
                      <i aria-hidden="true" /><strong>{option.label}</strong><small>{option.note}</small>
                    </button>
                  ))}
                </div>

                <div className="companion-familiar-mini-grid">
                  <div>
                    <span className="companion-familiar-subhead">Aura accent</span>
                    <div className="companion-color-options" role="radiogroup" aria-label="Familiar colour">
                      {familiarColors.map(option => (
                        <button key={option.value} type="button" role="radio" aria-checked={settings?.familiarColor === option.value} className={settings?.familiarColor === option.value ? `active color-${option.value}` : `color-${option.value}`} onClick={() => void patchFamiliar({ familiarColor: option.value })}>
                          <i aria-hidden="true" /><span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="companion-familiar-subhead">Material style</span>
                    <div className="companion-theme-options" role="radiogroup" aria-label="Familiar material style">
                      {familiarThemes.map(option => (
                        <button key={option.value} type="button" role="radio" aria-checked={settings?.familiarTheme === option.value} className={settings?.familiarTheme === option.value ? 'active' : ''} onClick={() => void patchFamiliar({ familiarTheme: option.value })}>
                          <span className={`companion-material-sample material-${option.value}`} aria-hidden="true"><i /></span><strong>{option.label}</strong><small>{option.note}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="companion-familiar-editor-block">
                <div className="companion-customize-heading"><span><Activity size={14} /> Presence</span><small>Visible only when you want it</small></div>
                <label className="companion-familiar-master-toggle">
                  <input type="checkbox" checked={settings?.familiarEnabled ?? true} onChange={event => void patchFamiliar({ familiarEnabled: event.target.checked })} />
                  <span><strong>Show Familiar across Ikigai Space</strong><small>Turn this off to remove the floating Familiar and its Sanctuary resident. The editor and your settings remain available here.</small></span>
                </label>
                <div className={settings?.familiarEnabled === false ? 'companion-familiar-presence-controls is-disabled' : 'companion-familiar-presence-controls'}>
                <div className="companion-activity-options" role="radiogroup" aria-label="Familiar presence">
                  {familiarActivities.map(option => (
                    <button key={option.value} type="button" role="radio" aria-checked={settings?.familiarActivity === option.value} className={settings?.familiarActivity === option.value ? 'active' : ''} onClick={() => void patchFamiliar({ familiarActivity: option.value })}>
                      <strong>{option.label}</strong><small>{option.note}</small>
                    </button>
                  ))}
                </div>
                <div className="companion-familiar-side-row" role="radiogroup" aria-label="Familiar nook side">
                  {(['left','right'] as FamiliarSide[]).map(side => (
                    <button key={side} type="button" role="radio" aria-checked={!settings?.familiarPosition && (settings?.familiarSide ?? 'right') === side} className={!settings?.familiarPosition && (settings?.familiarSide ?? 'right') === side ? 'active' : ''} onClick={() => void patchFamiliar({ familiarSide: side, familiarPosition: null })}>
                      <strong>{side === 'left' ? 'Dock left' : 'Dock right'}</strong><small>{side === 'left' ? 'Return to the lower-left nook.' : 'Return to the lower-right nook.'}</small>
                    </button>
                  ))}
                </div>
                <div className="companion-familiar-drag-note">
                  <span><strong>Free placement</strong><small>Drag the Familiar itself anywhere on screen. Its position is saved locally and adapts proportionally when the window changes size.</small></span>
                  {settings?.familiarPosition ? <button type="button" onClick={() => void patchFamiliar({ familiarPosition: null })}>Reset to {settings?.familiarSide === 'left' ? 'left' : 'right'} nook</button> : <em>Drag to place</em>}
                </div>
                </div>
              </section>

              <section className="companion-familiar-editor-block">
                <div className="companion-customize-heading"><span><Palette size={14} /> Interaction</span><small>Optional and local by default</small></div>
                <div className="companion-familiar-toggles">
                  <label><input type="checkbox" checked={settings?.familiarReactions ?? true} onChange={event => void patchFamiliar({ familiarReactions: event.target.checked })} /><span><strong>Quiet work reactions</strong><small>Small visual acknowledgements after completed work. No guilt, streak pressure or attention demands.</small></span></label>
                  <label><input type="checkbox" checked={settings?.familiarContextHints ?? true} onChange={event => void patchFamiliar({ familiarContextHints: event.target.checked })} /><span><strong>Room context</strong><small>Show local navigation/context hints in Together. These hints do not call an AI model.</small></span></label>
                  <label><input type="checkbox" checked={settings?.familiarPlay ?? true} onChange={event => void patchFamiliar({ familiarPlay: event.target.checked })} /><span><strong>Small play interactions</strong><small>Pet, toss a mote or let the Familiar settle. Nothing is scored or rewarded.</small></span></label>
                  <label><input type="checkbox" checked={Boolean(settings?.familiarSounds)} onChange={event => void patchFamiliar({ familiarSounds: event.target.checked })} /><span><strong>Interaction tones</strong><small>Short locally generated tones only when you directly interact. Off by default.</small></span></label>
                </div>
              </section>

              <p className="companion-familiar-principle">The Familiar does not pretend to be sentient, hungry, lonely or disappointed. AI errors live in the Talk state, not in the character's mood. Reduced Motion keeps every interaction available while removing unnecessary movement.</p>
            </div>
          </section>
        ) : null}

        {activeView === 'connection' ? (
          <div className="companion-connection-layout">
            <section className="companion-connection-panel companion-model-section">
              <fieldset disabled={runtime.active} className="companion-connection-fields">
              <div className="companion-rail-heading"><span className="ik-section-kicker">MODEL CONNECTION</span><span className={`companion-connection-dot ${connectionIndicator}`} /></div>
              <div className="companion-provider-tabs" role="group" aria-label="AI provider">
                <button type="button" className={state?.provider === 'ollama' ? 'active' : ''} onClick={() => void changeProvider('ollama')}><Laptop size={14} /> Ollama</button>
                <button type="button" className={state?.provider === 'api' ? 'active' : ''} onClick={() => void changeProvider('api')}><Cloud size={14} /> Remote API</button>
              </div>

              {state?.provider === 'api' ? (
                <>
                  <div className="companion-model-status"><Cloud size={17} /><div><strong>{runtime.phase === 'connected' ? 'Remote connection tested' : providerReady ? 'Remote configuration saved' : 'Connect a remote model'}</strong><small>Choose Gemini, add your key, then Save & test to load available models and validate a real reply. Endpoint details stay hidden unless you choose Custom.</small></div></div>

                  <div className="companion-provider-presets" aria-label="Remote API provider">
                    <button type="button" className={isGeminiRemote ? 'active' : ''} onClick={() => chooseRemotePreset('gemini')} aria-pressed={isGeminiRemote}>
                      <Sparkles size={14} /><span><strong>Gemini</strong><small>Managed Google endpoint · easiest setup</small></span>
                    </button>
                    <button type="button" className={!isGeminiRemote ? 'active' : ''} onClick={() => chooseRemotePreset('custom')} aria-pressed={!isGeminiRemote}>
                      <Cloud size={14} /><span><strong>Custom endpoint</strong><small>Any trusted OpenAI-compatible chat endpoint</small></span>
                    </button>
                  </div>

                  {isGeminiRemote ? (
                    <>
                      <label className="companion-field-label">Model
                        <div className="companion-select-wrap">
                          <select value={geminiModelPreset} onChange={event => { updateCompanionRuntime({ phase: 'configured' }); setConnection('offline'); setConnectionError(''); setModelDraft(event.target.value === '__custom__' ? '' : event.target.value); }}>
                            {GEMINI_MODEL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label} — {option.note}</option>)}
                            <option value="__custom__">Enter a model ID or load available models…</option>
                          </select>
                          <ChevronDown size={13} />
                        </div>
                      </label>
                      {geminiModelPreset === '__custom__' ? (
                        <label className="companion-field-label companion-field-subtle">Custom model ID<input value={modelDraft} onChange={event => { updateCompanionRuntime({ phase: 'configured' }); setConnection('offline'); setConnectionError(''); setModelDraft(event.target.value); }} spellCheck={false} autoCapitalize="none" autoCorrect="off" placeholder="Enter an exact model ID or Save & test to load available models" /></label>
                      ) : null}
                      <div className="companion-managed-endpoint" aria-label="Gemini endpoint managed by Ikigai Space">
                        <Sparkles size={14} />
                        <span><strong>Endpoint managed automatically</strong><small>Google Gemini · OpenAI-compatible chat endpoint</small></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="companion-field-label">Chat endpoint<input value={endpointDraft} onChange={event => { setEndpointDraft(event.target.value); setConnection('offline'); setConnectionError(''); }} spellCheck={false} inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="https://provider.example/v1/chat/completions" /></label>
                      {endpointTrust.valid && endpointTrust.requiresTrust ? (
                        <div className={endpointTrust.trusted ? 'companion-endpoint-trust is-trusted' : 'companion-endpoint-trust is-warning'}>
                          {endpointTrust.trusted ? <ShieldCheck size={17} /> : <ShieldAlert size={17} />}
                          <div>
                            <strong>{endpointTrust.trusted ? `${endpointTrust.hostname} is trusted on this device` : `Trust ${endpointTrust.hostname} before sending a key`}</strong>
                            <small>Custom endpoints can receive your API key and the context you explicitly send to Companion. Ikigai Space cannot verify who operates this server.</small>
                          </div>
                          {endpointTrust.trusted
                            ? <button type="button" onClick={forgetRemoteEndpointTrust}>Forget trust</button>
                            : <button type="button" onClick={trustRemoteEndpoint}>Trust endpoint</button>}
                        </div>
                      ) : !endpointTrust.valid && endpointDraft.trim() ? (
                        <div className="companion-endpoint-trust is-warning"><ShieldAlert size={17} /><div><strong>Endpoint blocked</strong><small>{endpointTrust.reason}</small></div></div>
                      ) : null}
                      <label className="companion-field-label">Model<input value={modelDraft} onChange={event => { updateCompanionRuntime({ phase: 'configured' }); setConnection('offline'); setConnectionError(''); setModelDraft(event.target.value); }} spellCheck={false} autoCapitalize="none" autoCorrect="off" placeholder="Provider model ID" /></label>
                    </>
                  )}
                  <label className="companion-field-label">API key<div className="companion-key-row"><KeyRound size={14} /><input type="password" autoComplete="off" value={apiKeyDraft} onChange={event => { setApiKeyDraft(event.target.value); updateCompanionRuntime({ phase: 'configured' }); }} placeholder={hasCompanionApiKey() ? (companionApiKeyRemembered() ? 'Key remembered on this device' : 'Key loaded for this tab') : 'Paste API key'} /><button type="button" onClick={() => { setCompanionApiKey(''); setApiKeyDraft(''); setRememberApiKey(false); setConnection('offline'); }}>Clear</button></div></label>
                  <label className="companion-key-memory">
                    <input type="checkbox" checked={rememberApiKey} onChange={event => setRememberApiKey(event.target.checked)} />
                    <span><strong>Remember key on this device</strong><small>Persists in this browser and stays outside Ikigai Space backups. Browser storage is not encrypted by Ikigai Space, so leave this off on shared or untrusted devices.</small></span>
                  </label>
                  <IkButton size="sm" variant="primary" disabled={runtime.active || connection === 'checking' || !endpointTrust.valid || (endpointTrust.requiresTrust && !endpointTrust.trusted)} onClick={() => void saveRemoteApi()}>{runtime.active ? 'Validating…' : 'Save & test'}</IkButton>
                  <p className="companion-api-warning">Browser-direct APIs must allow CORS. Remote mode sends the selected planning context, your message, and only documents visibly attached to that send. Ikigai Space refuses cross-origin redirects while an API key is attached.</p>
                </>
              ) : (
                <>
                  <div className="companion-model-status">
                    {connection === 'online' ? <Bot size={17} /> : connection === 'checking' ? <LoaderCircle size={17} className="spin" /> : <WifiOff size={17} />}
                    <div><strong>{connection === 'online' ? 'Ollama is reachable' : connection === 'checking' ? 'Checking Ollama…' : 'No local model connection'}</strong><small>No Ikigai Space context is sent until you press Send.</small></div>
                  </div>
                  <label className="companion-field-label">Endpoint<div className="companion-endpoint-row"><input value={endpointDraft} onChange={event => setEndpointDraft(event.target.value)} spellCheck={false} /><button type="button" onClick={() => void connectOllama()} aria-label="Check endpoint"><RefreshCw size={14} /></button></div></label>
                  <label className="companion-field-label">Model<div className="companion-select-wrap"><select value={state?.model ?? ''} onChange={event => void changeModel(event.target.value)} disabled={connection !== 'online' || !models.length}><option value="">{models.length ? 'Choose model' : 'No models found'}</option>{models.map(model => <option key={model} value={model}>{model}</option>)}</select><ChevronDown size={13} /></div></label>
                </>
              )}
              {connectionError ? <p className="companion-error" role="alert"><CircleOff size={13} /> {connectionError}</p> : null}
              </fieldset>
            </section>

            <section className="companion-connection-panel">
              <div className="companion-rail-heading"><span className="ik-section-kicker">CONTEXT WINDOW</span><small>{state?.contextScope ?? 'week'}</small></div>
              <div className="companion-scope-list">
                {(Object.keys(companionScopeLabels) as CompanionState['contextScope'][]).map(scope => (
                  <button key={scope} type="button" className={state?.contextScope === scope ? 'active' : ''} onClick={() => void changeScope(scope)}><strong>{companionScopeLabels[scope].label}</strong><small>{companionScopeLabels[scope].detail}</small></button>
                ))}
              </div>
              {summary ? <div className="companion-context-facts"><span><b>{summary.today}</b> today</span><span><b>{summary.overdue}</b> overdue</span><span><b>{summary.upcoming}</b> upcoming</span><span><b>{summary.roadmapPhases}</b> phases</span>{summary.phase ? <span className="wide"><b>{summary.mode?.toUpperCase()}</b> {summary.phase}</span> : null}</div> : null}
              <p className="companion-privacy">{companionPrivacyNote}</p>
            </section>

            <section className="companion-connection-panel companion-contract-panel">
              <span className="ik-section-kicker">AGENT CONTRACT</span>
              <p>The Familiar can draft tasks, roadmap structure, Career projects and proof from the material you provide, but it cannot delete, complete, or silently change anything. Every mutation remains an explicit proposal.</p>
            </section>
          </div>
        ) : null}

        {activeView === 'chat' ? (
          <section className="companion-chat-panel companion-conversation" aria-label="Companion conversation">
            {!messages.length ? (
              <EmptyState
                className="companion-empty"
                icon={<MessageCircle size={20} />}
                eyebrow="ASK FOR A PLAN, NOT JUST AN ANSWER"
                title="It can draft the structure with you."
                description="Ask for a plan or attach a roadmap/CV. The Companion can draft roadmap structure, Career projects, proof and tasks from that source; every proposed change stays reviewable before it touches Ikigai Space."
              >
                <div className="companion-quick-prompts">{quickPrompts.map(item => <button key={item} type="button" onClick={() => updatePrompt(item)}>{item}</button>)}</div>
              </EmptyState>
            ) : (
              <section className="companion-transcript" aria-live="polite">
                {messages.map(message => <TranscriptMessage key={message.id} message={message} selected={selected} setSelected={setSelected} onChanged={refreshMessages} />)}
                <div ref={transcriptEnd} />
              </section>
            )}

            {retry ? (
              <section className="companion-auto-retry" role="status" aria-live="polite">
                <RefreshCw size={14} className="spin" />
                <div>
                  <strong>Auto retry {retry.nextAttempt}/{retry.maxAttempts}</strong>
                  <span>Waiting about {Math.max(1, Math.ceil((Date.parse(retry.retryAt) - Date.now()) / 1000))}s before trying the same prompt again. No duplicate message will be saved.</span>
                </div>
              </section>
            ) : null}

            {requestError ? (
              <section className={`companion-request-error ${requestError.retryable ? 'is-retryable' : ''}`} role="alert">
                <div className="companion-request-error-icon"><AlertTriangle size={16} /></div>
                <div className="companion-request-error-copy">
                  <strong>{requestError.title}</strong>
                  <p>{requestError.detail}</p>
                  {requestError.code ? <small>{requestError.code}</small> : null}
                </div>
                {requestError.retryable && failedPrompt ? (
                  <IkButton size="sm" variant="quiet" onClick={() => void sendText(failedPrompt)} disabled={sending || Boolean(retry)}>
                    <RefreshCw size={13} className={sending ? 'spin' : ''} /> Retry
                  </IkButton>
                ) : null}
              </section>
            ) : null}

            {providerReady ? (
              <form className="companion-composer" onSubmit={submit}>
                <CompanionDocumentTray disabled={sending || Boolean(retry)} />
                <textarea
                  value={prompt}
                  onChange={event => updatePrompt(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={3}
                  placeholder="Ask for a plan, attach a roadmap, or bring in a CV for review…"
                  disabled={sending || Boolean(retry)}
                />
                <div className="companion-composer-foot">
                  <span>{requestError && failedPrompt === prompt.trim() ? 'Not sent · edit or retry' : 'Enter to send · Shift+Enter for a new line'}</span>
                  <IkButton type="submit" variant="primary" disabled={!prompt.trim() || sending || Boolean(retry)}>{sending ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />}{readingDocuments ? 'Reading documents…' : sending ? 'Request in progress…' : 'Send'}</IkButton>
                </div>
              </form>
            ) : (
              <section className="companion-chat-offline" aria-label="Conversation offline">
                <div><WifiOff size={16} /><span><strong>Talk is offline</strong><small>Your conversation stays here. Connect a model when you want to continue.</small></span></div>
                <IkButton size="sm" variant="quiet" onClick={() => changeView('connection')}><Settings2 size={13} /> AI settings</IkButton>
              </section>
            )}
          </section>
        ) : null}
      </div>
      {confirmDialog}
    </div>
  );
}
