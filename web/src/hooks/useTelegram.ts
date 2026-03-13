import { useEffect, useState } from "react";
import type { WebApp as WebAppType } from "@twa-dev/types";

// Access Telegram WebApp directly from window
declare global {
  interface Window {
    Telegram?: {
      WebApp: WebAppType;
    };
  }
}

const WebApp = window.Telegram?.WebApp;

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!WebApp) {
      console.error("Telegram WebApp is not available");
      return;
    }

    // Initialize Telegram Mini App
    WebApp.ready();
    WebApp.expand();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);

    // Set header color to match Telegram theme
    WebApp.setHeaderColor(WebApp.themeParams.bg_color || "#ffffff");
  }, []);

  return {
    webApp: WebApp,
    user: WebApp?.initDataUnsafe?.user,
    isReady,
    themeParams: WebApp?.themeParams,
    colorScheme: WebApp?.colorScheme,
    close: () => WebApp?.close(),
    showAlert: (message: string) => WebApp?.showAlert(message),
    showConfirm: (message: string) => WebApp?.showConfirm(message),
  };
}
