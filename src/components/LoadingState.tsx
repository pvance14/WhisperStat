export const LoadingState = ({ label }: { label: string }) => (
  <div className="auth-shell">
    <div className="auth-card card stack">
      <span className="chip">Loading</span>
      <h2>{label}</h2>
      <p className="supporting-text">
        WhisperStat is getting the live capture, report, and post-game workflow ready.
      </p>
    </div>
  </div>
);
