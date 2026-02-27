import type WebApp from "@twa-dev/sdk";

export function useCalendar(userId: number | undefined, webApp: typeof WebApp) {
  const handleCalendarSubscribe = async (type: "apple" | "google") => {
    if (!userId) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const calendarUrl = `${API_URL}/api/users/${userId}/calendar.ics`;

    if (type === "apple") {
      // iOS/macOS: Opens in Calendar app with subscribe prompt
      webApp.openLink(calendarUrl);
    } else {
      // Google Calendar: Copy URL and show instructions
      try {
        await navigator.clipboard.writeText(calendarUrl);
        webApp.showPopup({
          title: "Calendar URL Copied!",
          message:
            "To subscribe in Google Calendar:\n\n" +
            "1. Open Google Calendar\n" +
            "2. Tap ☰ Menu → Settings\n" +
            "3. Tap 'Add calendar'\n" +
            "4. Select 'From URL'\n" +
            "5. Paste the URL and tap 'Add calendar'\n\n" +
            "Your concerts will auto-sync!",
          buttons: [{ type: "default", text: "Got it" }],
        });
      } catch {
        // Fallback if clipboard fails
        webApp.showPopup({
          title: "Add to Google Calendar",
          message:
            `Copy this URL:\n${calendarUrl}\n\n` +
            "Then:\n" +
            "1. Open Google Calendar\n" +
            "2. Menu → Settings → Add calendar\n" +
            "3. Select 'From URL' and paste",
          buttons: [{ type: "default", text: "OK" }],
        });
      }
    }
  };

  return { handleCalendarSubscribe };
}
