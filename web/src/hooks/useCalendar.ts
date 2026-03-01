import type WebApp from "@twa-dev/sdk";

export function useCalendar(userId: number | undefined, webApp: typeof WebApp) {
  const handleCalendarSubscribe = (type: "apple" | "google") => {
    if (!userId) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const calendarUrl = `${API_URL}/api/users/${userId}/calendar.ics`;

    if (type === "apple") {
      // iOS/macOS: Opens in Calendar app with subscribe prompt
      webApp.openLink(calendarUrl);
    } else {
      // Android: Try webcal:// protocol which opens in default calendar app
      // Replace https:// or http:// with webcal://
      const webcalUrl = calendarUrl.replace(/^https?:\/\//, "webcal://");
      webApp.openLink(webcalUrl);
    }
  };

  return { handleCalendarSubscribe };
}
