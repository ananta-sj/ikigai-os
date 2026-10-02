export function workspaceIdParam(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(trimmed)) return null;
  return trimmed;
}
