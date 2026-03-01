import type WebApp from "@twa-dev/sdk";

export function useCalendar(userId: number | undefined, webApp: typeof WebApp) {
  const handleCalendarSubscribe = (method: "apple" | "google-webcal" | "google-render" | "google-direct" | "google-intent") => {
    if (!userId) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const calendarUrl = `${API_URL}/api/users/${userId}/calendar.ics`;

    switch (method) {
      case "apple":
        // iOS/macOS: Opens in Calendar app with subscribe prompt
        webApp.openLink(calendarUrl);
        break;

      case "google-webcal":
        // Android: webcal:// protocol
        const webcalUrl = calendarUrl.replace(/^https?:\/\//, "webcal://");
        webApp.openLink(webcalUrl);
        break;

      case "google-render":
        // Google Calendar web URL with webcal:// in cid parameter (from tutorial)
        const webcalForRender = calendarUrl.replace(/^https?:\/\//, "webcal://");
        const googleRenderUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalForRender)}`;
        webApp.openLink(googleRenderUrl);
        break;

      case "google-direct":
        // Direct .ics URL
        webApp.openLink(calendarUrl);
        break;

      case "google-intent":
        // Android intent URL to force app opening
        const host = new URL(calendarUrl).host;
        const path = new URL(calendarUrl).pathname;
        const intentUrl = `intent://${host}${path}#Intent;scheme=https;package=com.google.android.calendar;end`;
        webApp.openLink(intentUrl);
        break;
    }
  };

  return { handleCalendarSubscribe };
}
