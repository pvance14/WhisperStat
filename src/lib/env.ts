const normalize = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const appEnv = {
  supabaseUrl: normalize(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: normalize(import.meta.env.VITE_SUPABASE_ANON_KEY),
  supabaseRedirectUrl: normalize(import.meta.env.VITE_SUPABASE_REDIRECT_URL),
  environment: normalize(import.meta.env.VITE_APP_ENV) ?? "development",
  debugLogs: normalize(import.meta.env.VITE_ENABLE_DEBUG_LOGS) === "true"
};

export const isSupabaseConfigured = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);

export const getMissingEnvKeys = () => {
  const missing: string[] = [];

  if (!appEnv.supabaseUrl) {
    missing.push("VITE_SUPABASE_URL");
  }

  if (!appEnv.supabaseAnonKey) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }

  return missing;
};
