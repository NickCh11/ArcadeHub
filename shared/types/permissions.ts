export type Role = 'admin' | 'moderator' | 'user';

export type Permission =
  | 'room:create_public'
  | 'room:delete_any'
  | 'user:manage_roles';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'room:create_public',
    'room:delete_any',
    'user:manage_roles',
  ],
  moderator: [
    'room:create_public',
    'room:delete_any',
  ],
  user: [
    'room:create_public',
  ],
};

export function isRole(value: string): value is Role {
  return value === 'admin' || value === 'moderator' || value === 'user';
}

export function normalizeRole(value: string | null | undefined): Role {
  return value && isRole(value) ? value : 'user';
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
