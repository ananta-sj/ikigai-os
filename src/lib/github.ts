export interface GitHubPublicProfile {
  login: string;
  name?: string;
  bio?: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
}

export interface GitHubActivityDay {
  date: string;
  count: number;
}

export interface GitHubPublicActivity {
  profile: GitHubPublicProfile;
  days: GitHubActivityDay[];
  eventCount: number;
  note: string;
}

const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function normalizeGitHubUsername(value: string) {
  const normalized = value.trim().replace(/^@/, '');
  if (!normalized || !USERNAME_RE.test(normalized)) return '';
  return normalized;
}

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildPublicActivityDays(timestamps: string[], now = new Date()): GitHubActivityDay[] {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 90);
  const counts = new Map<string, number>();
  for (const stamp of timestamps) {
    const date = new Date(stamp);
    if (Number.isNaN(date.getTime()) || date < start || date > new Date(end.getTime() + 86400000)) continue;
    const key = utcDateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const days: GitHubActivityDay[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = utcDateKey(cursor);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return days;
}

async function githubJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer'
  });
  if (response.status === 404) throw new Error('GitHub user not found.');
  if (response.status === 403 || response.status === 429) throw new Error('GitHub public API limit reached. Try again later.');
  if (!response.ok) throw new Error(`GitHub could not be reached (${response.status}).`);
  return response.json() as Promise<unknown>;
}

export async function loadGitHubPublicActivity(rawUsername: string): Promise<GitHubPublicActivity> {
  const username = normalizeGitHubUsername(rawUsername);
  if (!username) throw new Error('Enter a valid GitHub username.');
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 9000);
  try {
    const encoded = encodeURIComponent(username);
    const [profileRaw, eventsRaw] = await Promise.all([
      githubJson(`https://api.github.com/users/${encoded}`, controller.signal),
      githubJson(`https://api.github.com/users/${encoded}/events/public?per_page=100`, controller.signal)
    ]);
    const profile = profileRaw as Record<string, unknown>;
    const events = Array.isArray(eventsRaw) ? eventsRaw : [];
    const timestamps = events.map(item => typeof (item as Record<string, unknown>).created_at === 'string' ? String((item as Record<string, unknown>).created_at) : '').filter(Boolean);
    return {
      profile: {
        login: String(profile.login ?? username),
        name: typeof profile.name === 'string' ? profile.name : undefined,
        bio: typeof profile.bio === 'string' ? profile.bio : undefined,
        htmlUrl: typeof profile.html_url === 'string' ? profile.html_url : `https://github.com/${encoded}`,
        publicRepos: Number(profile.public_repos ?? 0) || 0,
        followers: Number(profile.followers ?? 0) || 0
      },
      days: buildPublicActivityDays(timestamps),
      eventCount: timestamps.length,
      note: 'Public activity only. GitHub does not expose the full contribution calendar through its unauthenticated public API.'
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('GitHub took too long to respond.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
