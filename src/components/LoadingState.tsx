export const LoadingState = ({ label }: { label: string }) => (
  <div className="auth-shell">
    <div className="auth-card card stack">
      <span className="chip">Loading</span>
      <h2>{label}</h2>
      <p className="supporting-text">
        WhisperStat is getting the app shell, auth state, and team context ready.
      </p>
    </div>
  </div>
);
