import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { App } from "@/app/App";
import { appLog } from "@/lib/logger";
import "@/styles/global.css";

registerSW({
  immediate: true,
  onOfflineReady() {
    appLog("info", "pwa.offline_ready");
  },
  onNeedRefresh() {
    appLog("info", "pwa.update_available");
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
