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
      // Google Calendar: Use Google's calendar subscription URL
      // This will open in the Google Calendar app if installed, or web if not
      const googleCalendarUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarUrl)}`;
      webApp.openLink(googleCalendarUrl);
    }
  };

  return { handleCalendarSubscribe };
}
