import { SetMetadata } from '@nestjs/common';

export type UserRole = 'system_admin' | 'admin' | 'editor' | 'viewer';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
