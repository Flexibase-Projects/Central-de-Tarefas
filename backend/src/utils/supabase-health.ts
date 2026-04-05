/**
 * Sondagens leves para readiness e diagnóstico de startup (sem expor segredos).
 */

export async function probeSupabaseAuthReachable(): Promise<{ ok: boolean; detail?: string }> {
  const base = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (!base) {
    return { ok: false, detail: 'SUPABASE_URL ausente' };
  }
  try {
    const r = await fetch(`${base}/auth/v1/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      return { ok: false, detail: `auth_health_http_${r.status}` };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg };
  }
}

export async function probeSupabaseDbReady(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const { supabase } = await import('../config/supabase.js');
    const { error } = await supabase.from('cdt_users').select('id').limit(1).maybeSingle();
    if (error) {
      return { ok: false, detail: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg };
  }
}
