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
      // Google Calendar: Use Google Calendar render URL with webcal://
      const webcalUrl = calendarUrl.replace(/^https?:\/\//, "webcal://");
      const googleCalendarUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
      webApp.openLink(googleCalendarUrl);
    }
  };

  return { handleCalendarSubscribe };
}
