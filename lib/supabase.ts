import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:1',
  supabaseAnonKey || 'missing-supabase-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);

type ProviderInfo = {
  providerId: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export type AuthUser = {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: string | null;
  providerData: ProviderInfo[];
};

export const db = {};

export const auth = {
  currentUser: null as AuthUser | null,
};

function mapSupabaseUser(user: User | null): AuthUser | null {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const providerIds = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : user.app_metadata?.provider
      ? [user.app_metadata.provider]
      : [];

  return {
    id: user.id,
    uid: user.id,
    email: user.email ?? null,
    displayName:
      metadata.full_name ||
      metadata.name ||
      metadata.display_name ||
      user.email ||
      null,
    photoURL: metadata.avatar_url || metadata.picture || null,
    emailVerified: Boolean(user.email_confirmed_at),
    isAnonymous: user.is_anonymous ?? false,
    tenantId: null,
    providerData: providerIds.map((providerId) => ({
      providerId: String(providerId),
      displayName: metadata.full_name || metadata.name || null,
      email: user.email ?? null,
      photoURL: metadata.avatar_url || metadata.picture || null,
    })),
  };
}

export function getSupabaseConfigError() {
  return 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the exact local Supabase instance you want to use.';
}

export function onAuthStateChanged(
  _auth: typeof auth,
  callback: (user: AuthUser | null) => void,
) {
  let isActive = true;

  if (!isSupabaseConfigured) {
    queueMicrotask(() => {
      auth.currentUser = null;
      callback(null);
    });
    return () => {
      isActive = false;
    };
  }

  const applyUser = (user: User | null) => {
    if (!isActive) return;
    const mappedUser = mapSupabaseUser(user);
    auth.currentUser = mappedUser;

    callback(mappedUser);
  };

  const finishInitialSessionLoad = () => {
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('[Supabase] Failed to read auth session:', error.message);
      }
      applyUser(data.session?.user ?? null);
    });
  };

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const hasAuthCode = url.searchParams.has('code');
    const authError = url.searchParams.get('error_description') || url.searchParams.get('error');

    if (authError) {
      console.error('[Supabase] OAuth callback failed:', authError);
      finishInitialSessionLoad();
    } else if (hasAuthCode) {
      void supabase.auth.exchangeCodeForSession(window.location.href).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Failed to exchange OAuth code:', error.message);
        } else {
          url.searchParams.delete('code');
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        }
        finishInitialSessionLoad();
      });
    } else {
      finishInitialSessionLoad();
    }
  } else {
    finishInitialSessionLoad();
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    applyUser(session?.user ?? null);
  });

  return () => {
    isActive = false;
    data.subscription.unsubscribe();
  };
}

export async function loginWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error(getSupabaseConfigError());
  }

  const redirectTo =
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_TO ||
    (typeof window !== 'undefined' ? window.location.origin : undefined);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
