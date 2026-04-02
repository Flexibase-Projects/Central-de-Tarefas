import { supabase } from '../config/supabase.js';

export type AuthUserSummary = {
  id: string;
  email: string | null;
  name: string | null;
};

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized || null;
}

function toAuthUserSummary(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): AuthUserSummary {
  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : null;

  return {
    id: user.id,
    email: user.email ?? null,
    name: fullName ?? user.email ?? null,
  };
}

export async function listAuthUsers(): Promise<AuthUserSummary[]> {
  const users: AuthUserSummary[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const batch = data?.users ?? [];
    users.push(...batch.map((user) => toAuthUserSummary(user)));

    if (batch.length < 1000) break;
  }

  return users;
}

export async function findAuthUserByIdOrEmail(params: {
  id?: string | null;
  email?: string | null;
}): Promise<AuthUserSummary | null> {
  const candidateId = params.id?.trim() || null;
  const candidateEmail = normalizeEmail(params.email);

  if (!candidateId && !candidateEmail) {
    return null;
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const batch = data?.users ?? [];
    const match = batch.find((user) => {
      if (candidateId && user.id === candidateId) return true;
      if (candidateEmail && normalizeEmail(user.email) === candidateEmail) return true;
      return false;
    });

    if (match) {
      return toAuthUserSummary(match);
    }

    if (batch.length < 1000) break;
  }

  return null;
}
