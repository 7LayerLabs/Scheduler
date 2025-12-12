import type { Employee } from './types';

export type CanonicalEmployeeRole = 'bar';

function normalizeRoleToken(raw: string): CanonicalEmployeeRole | null {
  const token = (raw || '').trim().toLowerCase();
  if (!token) return null;

  if (token === 'bar' || token === 'bartender' || token === 'bartending') return 'bar';
  return null;
}

export function normalizeEmployeeRoleTags(roleTags: string[] | undefined): CanonicalEmployeeRole[] {
  const out: CanonicalEmployeeRole[] = [];
  const seen = new Set<string>();

  for (const raw of roleTags || []) {
    const normalized = normalizeRoleToken(raw);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

export function employeeHasRole(employee: Employee, role: CanonicalEmployeeRole): boolean {
  const tags = normalizeEmployeeRoleTags(employee.roleTags);
  return tags.includes(role);
}

export function isBartenderQualified(params: {
  employee: Employee;
  bartendingThreshold: number;
}): boolean {
  const { employee, bartendingThreshold } = params;
  return employee.bartendingScale >= bartendingThreshold || employeeHasRole(employee, 'bar');
}


