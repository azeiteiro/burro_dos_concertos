import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log("useTelegram initializing");
    console.log("WebApp object:", WebApp);

    // Initialize Telegram Mini App
    WebApp.ready();
    WebApp.expand();
    setIsReady(true);

    // Set header color to match Telegram theme
    WebApp.setHeaderColor(WebApp.themeParams.bg_color || "#ffffff");

    console.log("Telegram initialized, isReady set to true");
  }, []);

  return {
    webApp: WebApp,
    user: WebApp.initDataUnsafe?.user,
    isReady,
    themeParams: WebApp.themeParams,
    colorScheme: WebApp.colorScheme,
    close: () => WebApp.close(),
    showAlert: (message: string) => WebApp.showAlert(message),
    showConfirm: (message: string) => WebApp.showConfirm(message),
  };
}
