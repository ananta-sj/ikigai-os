import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
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
  RefreshCw,
  Send,
  Sparkles,
  WifiOff,
  X
} from 'lucide-react';
import { IkButton } from '../components/ui/IkButton';
import { PageHeader } from '../components/ui/PageHeader';
import {
  applyCompanionProposal,
  clearCompanionConversation,
  companionContextSummary,
  companionErrorPresentation,
  companionPrivacyNote,
  companionScopeLabels,
  configureRemoteApi,
  discoverOllamaModels,
  dismissCompanionProposal,
  ensureCompanionState,
  hasCompanionApiKey,
  listCompanionMessages,
  sendCompanionMessage,
  setCompanionApiKey,
  switchCompanionProvider,
  updateCompanionState
} from '../lib/companion';
import type { CompanionMessage, CompanionProposal, CompanionProvider, CompanionState } from '../types';
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

const quickPrompts = [
  'Build a realistic plan for the next month with roadmap phases and tasks.',
  'Lighten my next three days without losing the important work.',
  'Look at my roadmap and tell me what is missing or overloaded.'
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
  const pending = proposal.status === 'pending';

  async function dismiss() {
    setBusy(true);
    await dismissCompanionProposal(messageId, proposal.id);
    await onChanged();
    setBusy(false);
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
      </div>
      {pending ? <button type="button" className="companion-proposal-dismiss" onClick={() => void dismiss()} disabled={busy} aria-label="Dismiss proposal"><X size={14} /></button> : null}
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

  async function applySelected() {
    const ids = pending.filter(proposal => selected.has(proposal.id)).map(proposal => proposal.id);
    if (!ids.length) return;
    setApplying(true);
    for (const id of ids) await applyCompanionProposal(message.id, id);
    const next = new Set(selected);
    ids.forEach(id => next.delete(id));
    setSelected(next);
    await onChanged();
    setApplying(false);
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

function PetPortrait({ ready, waiting }: { ready: boolean; waiting: number }) {
  return (
    <div className={`companion-agent-pet ${ready ? 'ready' : 'sleeping'} ${waiting ? 'waiting' : ''}`} aria-hidden="true">
      <span className="agent-pet-orbit" />
      <span className="agent-pet-body">
        <i className="agent-pet-leaf left" /><i className="agent-pet-leaf right" />
        <i className="agent-pet-eye left" /><i className="agent-pet-eye right" /><i className="agent-pet-mouth" />
      </span>
      <small>{waiting ? `${waiting} proposal${waiting === 1 ? '' : 's'} waiting` : ready ? 'ready when you are' : 'connect a model to wake me'}</small>
    </div>
  );
}

export function CompanionPage() {
  const [state, setState] = useState<CompanionState | null>(null);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [connection, setConnection] = useState<'checking' | 'online' | 'offline'>('checking');
  const [connectionError, setConnectionError] = useState('');
  const [endpointDraft, setEndpointDraft] = useState('http://localhost:11434');
  const [modelDraft, setModelDraft] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState<CompanionErrorPresentation | null>(null);
  const [failedPrompt, setFailedPrompt] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<ContextSummary | null>(null);
  const transcriptEnd = useRef<HTMLDivElement | null>(null);

  async function refreshMessages() {
    const next = await listCompanionMessages();
    setMessages(next);
    const pendingIds = next.flatMap(message => message.proposals ?? []).filter(proposal => proposal.status === 'pending').map(proposal => proposal.id);
    setSelected(current => {
      const nextSet = new Set(current);
      pendingIds.forEach(id => nextSet.add(id));
      return nextSet;
    });
  }

  async function refreshSummary(scope: CompanionState['contextScope']) {
    setSummary(await companionContextSummary(scope));
  }

  async function connectOllama(endpoint = endpointDraft) {
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
      setConnectionError(error instanceof Error ? error.message : 'Could not reach the local model.');
    }
  }

  async function saveRemoteApi() {
    setConnection('checking');
    setConnectionError('');
    try {
      const next = await configureRemoteApi({ endpoint: endpointDraft, model: modelDraft, apiKey: apiKeyDraft });
      setState(next);
      setApiKeyDraft('');
      setConnection('online');
    } catch (error) {
      setConnection('offline');
      setConnectionError(error instanceof Error ? error.message : 'Could not configure the remote model.');
    }
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      const current = await ensureCompanionState();
      if (!alive) return;
      setState(current);
      setEndpointDraft(current.endpoint);
      setModelDraft(current.model);
      await Promise.all([refreshMessages(), refreshSummary(current.contextScope)]);
      if (!alive) return;
      if (current.provider === 'ollama') await connectOllama(current.endpoint);
      else setConnection(current.model && current.endpoint && hasCompanionApiKey() ? 'online' : 'offline');
    })();
    return () => { alive = false; };
    // Intentional one-time bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const pendingCount = useMemo(() => messages.flatMap(message => message.proposals ?? []).filter(proposal => proposal.status === 'pending').length, [messages]);
  const providerReady = Boolean(state?.model) && connection === 'online';

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

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setConnectionError('');
    setRequestError(null);
    setFailedPrompt('');
    setPrompt('');
    try {
      await sendCompanionMessage(trimmed);
      await Promise.all([refreshMessages(), state ? refreshSummary(state.contextScope) : Promise.resolve()]);
    } catch (error) {
      setPrompt(trimmed);
      setFailedPrompt(trimmed);
      setRequestError(companionErrorPresentation(error));
    } finally {
      setSending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendText(prompt);
  }

  async function clearConversation() {
    if (!messages.length || !window.confirm('Clear the local companion conversation? Applied changes will remain.')) return;
    await clearCompanionConversation();
    setMessages([]);
    setSelected(new Set());
  }

  return (
    <div className="page companion-page">
      <div className="ik-page-width">
        <PageHeader
          eyebrow={<><Sparkles size={12} /> COMPANION · AGENT</>}
          title="A small mind beside the system."
          description="Talk through plans, ask for a month of structure, or let the companion draft tasks and roadmap phases. It proposes; you approve."
          actions={<IkButton variant="quiet" size="sm" onClick={() => void clearConversation()} disabled={!messages.length}><Eraser size={13} /> Clear conversation</IkButton>}
          meta={<><span>{state?.provider === 'api' ? 'REMOTE API' : 'LOCAL OLLAMA'}</span><span>·</span><span>{pendingCount} pending proposal{pendingCount === 1 ? '' : 's'}</span></>}
        />

        <div className="companion-layout">
          <main className="companion-conversation">
            {!messages.length ? (
              <section className="companion-empty companion-empty-agent">
                <PetPortrait ready={providerReady} waiting={pendingCount} />
                <div>
                  <span className="ik-section-kicker">ASK FOR A PLAN, NOT JUST AN ANSWER</span>
                  <h2>It can draft the structure with you.</h2>
                  <p>Ask for a month plan and the companion can propose roadmap phases, checkpoints and scheduled tasks. Every proposed change stays reviewable before it touches Ikigai.</p>
                  <div className="companion-quick-prompts">{quickPrompts.map(item => <button key={item} type="button" onClick={() => setPrompt(item)}>{item}</button>)}</div>
                </div>
              </section>
            ) : (
              <section className="companion-transcript" aria-live="polite">
                {messages.map(message => <TranscriptMessage key={message.id} message={message} selected={selected} setSelected={setSelected} onChanged={refreshMessages} />)}
                <div ref={transcriptEnd} />
              </section>
            )}

            {requestError ? (
              <section className={`companion-request-error ${requestError.retryable ? 'is-retryable' : ''}`} role="alert">
                <div className="companion-request-error-icon"><AlertTriangle size={16} /></div>
                <div className="companion-request-error-copy">
                  <strong>{requestError.title}</strong>
                  <p>{requestError.detail}</p>
                  {requestError.code ? <small>{requestError.code}</small> : null}
                </div>
                {requestError.retryable && failedPrompt ? (
                  <IkButton size="sm" variant="quiet" onClick={() => void sendText(failedPrompt)} disabled={sending}>
                    <RefreshCw size={13} className={sending ? 'spin' : ''} /> Retry
                  </IkButton>
                ) : null}
              </section>
            ) : null}

            <form className="companion-composer" onSubmit={submit}>
              <textarea
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={3}
                placeholder={providerReady ? 'Ask for a month plan, workload change, roadmap structure, or a decision…' : 'Connect a model first…'}
                disabled={!providerReady || sending}
              />
              <div className="companion-composer-foot">
                <span>Enter to send · Shift+Enter for a new line</span>
                <IkButton type="submit" variant="primary" disabled={!prompt.trim() || !providerReady || sending}>{sending ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />}{sending ? 'Thinking…' : 'Send'}</IkButton>
              </div>
            </form>
          </main>

          <aside className="companion-rail">
            <section className="companion-rail-section companion-model-section">
              <div className="companion-rail-heading"><span className="ik-section-kicker">MODEL CONNECTION</span><span className={`companion-connection-dot ${connection}`} /></div>
              <div className="companion-provider-tabs" role="group" aria-label="AI provider">
                <button type="button" className={state?.provider === 'ollama' ? 'active' : ''} onClick={() => void changeProvider('ollama')}><Laptop size={14} /> Ollama</button>
                <button type="button" className={state?.provider === 'api' ? 'active' : ''} onClick={() => void changeProvider('api')}><Cloud size={14} /> Remote API</button>
              </div>

              {state?.provider === 'api' ? (
                <>
                  <div className="companion-model-status"><Cloud size={17} /><div><strong>{providerReady ? 'Remote model saved' : 'Add an API connection'}</strong><small>The key stays in this browser tab only. The first real request tests the endpoint.</small></div></div>
                  <label className="companion-field-label">Chat endpoint<input value={endpointDraft} onChange={event => setEndpointDraft(event.target.value)} spellCheck={false} placeholder="https://provider.example/v1/chat/completions" /></label>
                  <label className="companion-field-label">Model<input value={modelDraft} onChange={event => setModelDraft(event.target.value)} spellCheck={false} placeholder="Provider model name" /></label>
                  <label className="companion-field-label">API key<div className="companion-key-row"><KeyRound size={14} /><input type="password" value={apiKeyDraft} onChange={event => setApiKeyDraft(event.target.value)} placeholder={hasCompanionApiKey() ? 'Key loaded for this tab' : 'Not stored in backups'} /><button type="button" onClick={() => { setCompanionApiKey(''); setApiKeyDraft(''); setConnection('offline'); }}>Clear</button></div></label>
                  <IkButton size="sm" variant="primary" onClick={() => void saveRemoteApi()}>Save connection</IkButton>
                  <p className="companion-api-warning">Browser-direct APIs must allow CORS. For maximum privacy, use Ollama. Remote mode sends the selected planning context to your provider.</p>
                </>
              ) : (
                <>
                  <div className="companion-model-status">
                    {connection === 'online' ? <Bot size={17} /> : connection === 'checking' ? <LoaderCircle size={17} className="spin" /> : <WifiOff size={17} />}
                    <div><strong>{connection === 'online' ? 'Ollama is reachable' : connection === 'checking' ? 'Checking Ollama…' : 'No local model connection'}</strong><small>No Ikigai context is sent until you press Send.</small></div>
                  </div>
                  <label className="companion-field-label">Endpoint<div className="companion-endpoint-row"><input value={endpointDraft} onChange={event => setEndpointDraft(event.target.value)} spellCheck={false} /><button type="button" onClick={() => void connectOllama()} aria-label="Check endpoint"><RefreshCw size={14} /></button></div></label>
                  <label className="companion-field-label">Model<div className="companion-select-wrap"><select value={state?.model ?? ''} onChange={event => void changeModel(event.target.value)} disabled={connection !== 'online' || !models.length}><option value="">{models.length ? 'Choose model' : 'No models found'}</option>{models.map(model => <option key={model} value={model}>{model}</option>)}</select><ChevronDown size={13} /></div></label>
                </>
              )}
              {connectionError ? <p className="companion-error"><CircleOff size={13} /> {connectionError}</p> : null}
            </section>

            <section className="companion-rail-section">
              <div className="companion-rail-heading"><span className="ik-section-kicker">CONTEXT WINDOW</span><small>{state?.contextScope ?? 'week'}</small></div>
              <div className="companion-scope-list">
                {(Object.keys(companionScopeLabels) as CompanionState['contextScope'][]).map(scope => (
                  <button key={scope} type="button" className={state?.contextScope === scope ? 'active' : ''} onClick={() => void changeScope(scope)}><strong>{companionScopeLabels[scope].label}</strong><small>{companionScopeLabels[scope].detail}</small></button>
                ))}
              </div>
              {summary ? <div className="companion-context-facts"><span><b>{summary.today}</b> today</span><span><b>{summary.overdue}</b> overdue</span><span><b>{summary.upcoming}</b> upcoming</span><span><b>{summary.roadmapPhases}</b> phases</span>{summary.phase ? <span className="wide"><b>{summary.mode?.toUpperCase()}</b> {summary.phase}</span> : null}</div> : null}
              <p className="companion-privacy">{companionPrivacyNote}</p>
            </section>

            <section className="companion-rail-note"><span>AGENT CONTRACT</span><p>The pet can draft tasks and roadmap structure, but it cannot delete, complete, or silently change anything. Every mutation remains an explicit proposal.</p></section>
          </aside>
        </div>
      </div>
    </div>
  );
}
