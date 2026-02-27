interface TelegramWebApp {
  openLink: (url: string) => void;
}

export function useCalendar(userId: number | undefined, webApp: TelegramWebApp) {
  const handleCalendarSubscribe = () => {
    if (!userId) return;

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const calendarUrl = `${API_URL}/api/users/${userId}/calendar.ics`;

    // For both Apple and Google Calendar, just open the .ics URL
    // The device/browser will handle it:
    // - iOS/macOS: Opens in Calendar app with subscribe prompt
    // - Android: Should prompt to add to Google Calendar
    // - Desktop: Downloads file to open/import
    webApp.openLink(calendarUrl);
  };

  return { handleCalendarSubscribe };
}
