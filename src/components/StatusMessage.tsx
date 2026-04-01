type StatusTone = "info" | "success" | "warn" | "error";

export const StatusMessage = ({
  tone,
  message
}: {
  tone: StatusTone;
  message: string;
}) => <div className={`status ${tone}`}>{message}</div>;
