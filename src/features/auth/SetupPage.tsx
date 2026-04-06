import { Link } from "react-router-dom";

import { StatusMessage } from "@/components/StatusMessage";
import { getMissingEnvKeys } from "@/lib/env";

export const SetupPage = () => {
  const missingKeys = getMissingEnvKeys();

  return (
    <div className="setup-shell">
      <section className="setup-card card stack">
        <span className="chip">Connection setup</span>
        <div>
          <h2>WhisperStat isn’t connected to your project yet</h2>
          <p className="supporting-text">
            The interface loads, but sign-in and saving games need your project URL and keys filled
            in. A maintainer usually copies them from the hosting dashboard into a local{" "}
            <span className="mono">.env</span> file.
          </p>
        </div>

        <StatusMessage
          tone="warn"
          message={`Missing settings: ${missingKeys.length > 0 ? missingKeys.join(", ") : "unknown"}`}
        />

        <div className="stack" style={{ gap: "0.4rem" }}>
          <strong>Typical setup</strong>
          <div className="mono">cp .env.example .env</div>
          <div className="mono">Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</div>
          <div className="mono">
            Optional: set VITE_SUPABASE_REDIRECT_URL for local test redirects only
          </div>
          <div className="mono">Allowlist your local and deployed app URLs under Auth → URL configuration</div>
          <div className="mono">npm install</div>
          <div className="mono">npm run dev</div>
        </div>

        <p className="supporting-text">
          After the keys are saved, reload and you can use email sign-in and the rest of the app.
        </p>

        <Link className="button-secondary" to="/auth">
          Try sign-in again
        </Link>
      </section>
    </div>
  );
};
