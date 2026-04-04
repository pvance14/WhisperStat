import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/app/AuthProvider";
import { StatusMessage } from "@/components/StatusMessage";
import { appEnv, isDevAdminShortcutAvailable } from "@/lib/env";
import { getErrorMessage } from "@/lib/utils";

export const AuthPage = () => {
  const { session, isConfigured, signInWithMagicLink, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );
  const [activeAction, setActiveAction] = useState<"magic-link" | "dev-admin" | null>(null);

  if (!isConfigured) {
    return <Navigate to="/setup" replace />;
  }

  if (session) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="auth-shell">
      <section className="auth-card card stack">
        <span className="chip">Magic-link auth</span>
        <div>
          <h2>Sign in to WhisperStat</h2>
          <p className="supporting-text">
            Sign in with email; Supabase sends a magic link so coach sessions stay tied to secure,
            RLS-backed data.
          </p>
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setStatus(null);
            setActiveAction("magic-link");

            void signInWithMagicLink(email)
              .then(() => {
                setStatus({
                  tone: "success",
                  message: "Magic link sent. Open the email on this device to finish signing in."
                });
              })
              .catch((error) => {
                setStatus({
                  tone: "error",
                  message: getErrorMessage(error)
                });
              })
              .finally(() => setActiveAction(null));
          }}
        >
          <label className="stack" style={{ gap: "0.4rem" }}>
            <span className="muted">Email address</span>
            <input
              type="email"
              placeholder="coach@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <div className="form-actions">
            <button className="button" type="submit" disabled={activeAction !== null}>
              {activeAction === "magic-link" ? "Sending..." : "Send magic link"}
            </button>
          </div>
        </form>

        {isDevAdminShortcutAvailable ? (
          <div className="stack">
            <div>
              <strong>Development shortcut</strong>
              <p className="supporting-text" style={{ marginBottom: 0 }}>
                This signs into a real Supabase test account using local-only env vars, so RLS and
                session behavior still match the real app.
              </p>
            </div>
            <div className="form-actions">
              <button
                className="button-secondary"
                type="button"
                disabled={activeAction !== null}
                onClick={() => {
                  if (!appEnv.devAdminEmail || !appEnv.devAdminPassword) {
                    setStatus({
                      tone: "error",
                      message: "Dev admin credentials are missing from local env vars."
                    });
                    return;
                  }

                  setStatus(null);
                  setActiveAction("dev-admin");

                  void signInWithPassword(appEnv.devAdminEmail, appEnv.devAdminPassword)
                    .catch((error) =>
                      setStatus({
                        tone: "error",
                        message: getErrorMessage(error)
                      })
                    )
                    .finally(() => setActiveAction(null));
                }}
              >
                {activeAction === "dev-admin" ? "Signing in..." : "Continue as dev admin"}
              </button>
            </div>
          </div>
        ) : null}

        {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      </section>
    </div>
  );
};
