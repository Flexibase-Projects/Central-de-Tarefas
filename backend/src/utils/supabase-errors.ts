/**
 * Verifica se o erro indica que o Supabase está indisponível (ex.: local não está rodando).
 */
export function isSupabaseConnectionRefused(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  const message = String(e?.message ?? '');
  const details = e?.details ?? '';
  const detailsStr = typeof details === 'string' ? details : String(details);
  const cause = e?.cause as Record<string, unknown> | undefined;
  return (
    message.includes('fetch failed') ||
    detailsStr.includes('ECONNREFUSED') ||
    (cause && (cause.code === 'ECONNREFUSED' || cause.errno === 'ECONNREFUSED'))
  );
}

export const SUPABASE_UNAVAILABLE_MESSAGE =
  'Supabase indisponível (127.0.0.1:54321). Inicie o Supabase local com "supabase start" ou use a URL do projeto em nuvem no .env.local.';
