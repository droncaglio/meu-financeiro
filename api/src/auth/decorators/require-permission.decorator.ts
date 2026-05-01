import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../common/constants/permissions';

export const PERMISSIONS_KEY = 'permissions';

// Requires ALL listed permissions (AND). For a single permission, pass one argument.
export const RequiresPermission = (...perms: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
