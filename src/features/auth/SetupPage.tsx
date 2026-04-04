import { Link } from "react-router-dom";

import { StatusMessage } from "@/components/StatusMessage";
import { getMissingEnvKeys } from "@/lib/env";

export const SetupPage = () => {
  const missingKeys = getMissingEnvKeys();

  return (
    <div className="setup-shell">
      <section className="setup-card card stack">
        <span className="chip">Environment setup</span>
        <div>
          <h2>Supabase config is still missing</h2>
          <p className="supporting-text">
            The app is ready, but auth and data need real Vite env values before sign-in and
            Supabase CRUD can run.
          </p>
        </div>

        <StatusMessage
          tone="warn"
          message={`Missing env keys: ${missingKeys.length > 0 ? missingKeys.join(", ") : "unknown"}`}
        />

        <div className="stack" style={{ gap: "0.4rem" }}>
          <strong>Next steps</strong>
          <div className="mono">cp .env.example .env</div>
          <div className="mono">Set VITE_SUPABASE_REDIRECT_URL to your local or deployed origin</div>
          <div className="mono">Allowlist that same URL in Supabase Auth settings</div>
          <div className="mono">npm install</div>
          <div className="mono">npm run dev</div>
        </div>

        <p className="supporting-text">
          Once those values are present, the app will enable magic-link auth and the RLS-backed
          foundation routes.
        </p>

        <Link className="button-secondary" to="/auth">
          Re-check auth route
        </Link>
      </section>
    </div>
  );
};
