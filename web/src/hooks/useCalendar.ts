import type WebApp from "@twa-dev/sdk";

type CalendarMethod =
  | "apple"
  | "google-1"
  | "google-2"
  | "google-3"
  | "google-4"
  | "google-5"
  | "google-6"
  | "google-copy";

export function useCalendar(userId: number | undefined, webApp: typeof WebApp) {
  const handleCalendarSubscribe = async (method: CalendarMethod) => {
    if (!userId) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const calendarUrl = `${API_URL}/api/users/${userId}/calendar.ics`;
    const webcalUrl = calendarUrl.replace(/^https?:\/\//, "webcal://");

    switch (method) {
      case "apple":
        webApp.openLink(calendarUrl);
        break;

      case "google-1":
        // webcal:// + www.google.com/render
        webApp.openLink(
          `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
        );
        break;

      case "google-2":
        // https:// + www.google.com/render
        webApp.openLink(
          `https://www.google.com/calendar/render?cid=${encodeURIComponent(calendarUrl)}`
        );
        break;

      case "google-3":
        // webcal:// + calendar.google.com/render
        webApp.openLink(
          `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
        );
        break;

      case "google-4":
        // https:// + calendar.google.com/render
        webApp.openLink(
          `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarUrl)}`
        );
        break;

      case "google-5":
        // Direct webcal:// URL
        webApp.openLink(webcalUrl);
        break;

      case "google-6":
        // Direct https:// URL
        webApp.openLink(calendarUrl);
        break;

      case "google-copy":
        // Copy URL to clipboard
        try {
          await navigator.clipboard.writeText(calendarUrl);
          webApp.showPopup({
            title: "Calendar URL Copied!",
            message: `Calendar URL copied to clipboard:\n\n${calendarUrl}\n\nOpen Google Calendar and add from URL.`,
            buttons: [{ type: "default", text: "OK" }],
          });
        } catch {
          webApp.showPopup({
            title: "Calendar URL",
            message: `Copy this URL:\n\n${calendarUrl}\n\nThen add it in Google Calendar settings.`,
            buttons: [{ type: "default", text: "OK" }],
          });
        }
        break;
    }
  };

  return { handleCalendarSubscribe };
}
