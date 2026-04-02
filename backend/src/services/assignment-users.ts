import { getTrimmedString } from '../utils/validation.js';
import { findCdtUserByField } from './cdt-users.js';
import { findAuthUserByIdOrEmail } from './auth-users.js';

export async function resolveAuthBackedUserId(
  rawValue: unknown,
  fieldName: string,
): Promise<string | null> {
  const normalized = getTrimmedString(rawValue);
  if (!normalized) return null;

  const localUser = await findCdtUserByField({
    field: 'id',
    value: normalized,
    includeColumns: [],
  }).catch(() => null);

  const authUser = await findAuthUserByIdOrEmail({
    id: normalized,
    email: localUser?.email ?? null,
  });

  if (!authUser?.id) {
    throw new Error(`${fieldName} must reference a linked auth user`);
  }

  return authUser.id;
}
