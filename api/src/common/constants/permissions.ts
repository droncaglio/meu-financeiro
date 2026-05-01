export const PERMISSIONS = {
  ACCOUNTS_READ: 'accounts:read',
  ACCOUNTS_WRITE: 'accounts:write',
  ENTRIES_READ: 'entries:read',
  ENTRIES_WRITE: 'entries:write',
  ENTRIES_DELETE: 'entries:delete',
  COMMITMENTS_READ: 'commitments:read',
  COMMITMENTS_WRITE: 'commitments:write',
  COMMITMENTS_DELETE: 'commitments:delete',
  REPORTS_READ: 'reports:read',
  BANK_ACCOUNTS_READ: 'bank_accounts:read',
  BANK_ACCOUNTS_WRITE: 'bank_accounts:write',
  IMPORTS_RUN: 'imports:run',
  IMPORTS_CONFIRM: 'imports:confirm',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
