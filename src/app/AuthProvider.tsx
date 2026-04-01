import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { appLog } from "@/lib/logger";
import { isSupabaseConfigured } from "@/lib/env";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signInWithMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      appLog("warn", "auth.supabase.not_configured");
      return;
    }

    let mounted = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) {
          return;
        }

        if (error) {
          appLog("error", "auth.get_session_failed", { error: error.message });
        }

        setSession(data.session);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        appLog("error", "auth.get_session_threw", {
          error: error instanceof Error ? error.message : String(error)
        });
        setIsLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      appLog("info", "auth.state_changed", {
        event,
        userId: nextSession?.user.id ?? null
      });
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      signInWithMagicLink: async (email: string) => {
        if (!supabase) {
          throw new Error("Supabase is not configured yet.");
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (error) {
          throw error;
        }

        appLog("info", "auth.magic_link_requested", { email });
      },
      signOut: async () => {
        if (!supabase) {
          return;
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      }
    }),
    [isLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
};
