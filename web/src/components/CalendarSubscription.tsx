import { SiApple, SiSamsung, SiGoogle } from "react-icons/si";
import { HiCalendar } from "react-icons/hi2";
import type WebApp from "@twa-dev/sdk";
import { useCalendar } from "../hooks/useCalendar";

interface CalendarSubscriptionProps {
  userId: number;
  webApp: typeof WebApp;
}

export function CalendarSubscription({ userId, webApp }: CalendarSubscriptionProps) {
  const { handleCalendarSubscribe } = useCalendar(userId, webApp);

  return (
    <div
      className="mb-4 p-4 rounded-lg border"
      style={{
        borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
        backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <HiCalendar className="text-lg" style={{ color: "var(--tg-theme-text-color, #000000)" }} />
        <h3 className="font-semibold" style={{ color: "var(--tg-theme-text-color, #000000)" }}>
          Subscribe to Calendar
        </h3>
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--tg-theme-hint-color, #999999)" }}>
        Get automatic updates for all your concerts
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleCalendarSubscribe("apple")}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #ffffff)",
          }}
        >
          <SiApple className="w-4 h-4" />
          Apple
        </button>
        <button
          onClick={() => handleCalendarSubscribe("samsung")}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #ffffff)",
          }}
        >
          <SiSamsung className="w-4 h-4" />
          Samsung
        </button>
        <button
          onClick={() => handleCalendarSubscribe("google")}
          className="col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #ffffff)",
          }}
        >
          <SiGoogle className="w-4 h-4" />
          Google Calendar
        </button>
      </div>
    </div>
  );
}
