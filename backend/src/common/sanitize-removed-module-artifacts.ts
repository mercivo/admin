const REMOVED_CONFIG_KEYS = new Set(['agent', 'agentId', 'welcome', 'quickReplies']);

export function sanitizeRemovedModuleArtifacts(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter(item => !(item && typeof item === 'object' && !Array.isArray(item) && (item as Record<string, unknown>).type === 'assistant'))
      .map(sanitizeRemovedModuleArtifacts);
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !REMOVED_CONFIG_KEYS.has(key))
      .map(([key, child]) => [key, sanitizeRemovedModuleArtifacts(child)]),
  );
}
