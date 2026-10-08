// Browser demo and installed app share routes/assets but have different URL bases.
export function appPath(path: string, base = import.meta.env?.BASE_URL ?? '/') {
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\/+/, '')}`;
}
