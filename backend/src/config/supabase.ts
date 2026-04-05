import { createClient } from '@supabase/supabase-js';

// Lazy initialization: Get Supabase client, initializing it on first access
// This ensures dotenv.config() has already run before we read process.env
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    // Monorepo: .env.local costuma repetir só VITE_SUPABASE_* para o frontend.
    // Sem estes fallbacks o backend cai no client placeholder e auth.getUser(JWT) falha → /api/users/me 401.
    const supabaseUrl =
      (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      ''
    ).trim();

    const usedViteUrlFallback = !process.env.SUPABASE_URL?.trim() && Boolean(process.env.VITE_SUPABASE_URL?.trim());
    const usedViteKeyFallback =
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
      !process.env.SUPABASE_ANON_KEY?.trim() &&
      Boolean(process.env.VITE_SUPABASE_ANON_KEY?.trim());

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in backend/.env.local');
      console.warn('⚠️  The backend will start but database operations will fail until credentials are configured.');
      // Create a client with dummy values to prevent initialization error
      // Actual operations will fail with proper error messages
      supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key');
    } else {
      if (usedViteUrlFallback || usedViteKeyFallback) {
        console.warn(
          '⚠️  Backend usando VITE_SUPABASE_* como fallback. Para produção defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (sem prefixo VITE_).',
        );
      }
      console.log('✅ Supabase configured successfully');
      supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
  }
  return supabaseClient;
}

// Export a proxy that initializes on first access
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
