export function currentPermissions(): string[] {
  try { return JSON.parse(localStorage.getItem('mercivo_tenant') || '{}').permissions || []; } catch { return []; }
}

export function can(permission: string): boolean {
  const permissions = currentPermissions();
  return permissions.includes(permission);
}
