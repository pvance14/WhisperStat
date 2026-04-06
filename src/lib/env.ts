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
  deepgramBrowserApiKey: normalize(import.meta.env.VITE_DEEPGRAM_API_KEY),
  llmParseEnabled: normalize(import.meta.env.VITE_LLM_PARSE_ENABLED) === "true",
  devAdminEmail: normalize(import.meta.env.VITE_DEV_ADMIN_EMAIL),
  devAdminPassword: normalize(import.meta.env.VITE_DEV_ADMIN_PASSWORD),
  enableDevAdminShortcut: normalize(import.meta.env.VITE_ENABLE_DEV_ADMIN_SHORTCUT) === "true",
  environment: normalize(import.meta.env.VITE_APP_ENV) ?? (import.meta.env.PROD ? "production" : "development"),
  debugLogs: normalize(import.meta.env.VITE_ENABLE_DEBUG_LOGS) === "true"
};

export const isSupabaseConfigured = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);

export const isDevAdminShortcutAvailable =
  appEnv.environment !== "production" &&
  appEnv.enableDevAdminShortcut &&
  Boolean(appEnv.devAdminEmail && appEnv.devAdminPassword);

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
