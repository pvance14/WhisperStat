import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/app/AuthProvider";
import { StatusMessage } from "@/components/StatusMessage";
import { getErrorMessage } from "@/lib/utils";

export const AuthPage = () => {
  const { session, isConfigured, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            Phase 2 locks in the Supabase email login flow so later feature work can depend on
            real coach sessions and RLS.
          </p>
        </div>

        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            setStatus(null);
            setIsSubmitting(true);

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
              .finally(() => setIsSubmitting(false));
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
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send magic link"}
            </button>
          </div>
        </form>

        {status ? <StatusMessage tone={status.tone} message={status.message} /> : null}
      </section>
    </div>
  );
};
