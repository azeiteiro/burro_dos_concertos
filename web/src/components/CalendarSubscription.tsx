import { SiApple, SiSamsung, SiGoogle } from "react-icons/si";
import type { WebApp } from "@twa-dev/types";
import { useCalendar } from "../hooks/useCalendar";
import { Section, Button } from "@telegram-apps/telegram-ui";

interface CalendarSubscriptionProps {
  userId: number;
  webApp: WebApp;
}

export function CalendarSubscription({ userId, webApp }: CalendarSubscriptionProps) {
  const { handleCalendarSubscribe } = useCalendar(userId, webApp);

  return (
    <Section header="📅 Calendar Subscription">
      <div className="mb-4">
        <p className="text-sm mb-3">
          Subscribe to your concert calendar in your favorite calendar app:
        </p>

        <div className="flex flex-col gap-2">
          <Button
            mode="filled"
            size="m"
            onClick={() => handleCalendarSubscribe("apple")}
            className="w-full"
          >
            <SiApple className="w-4 h-4 inline mr-2" />
            Add to Apple Calendar
          </Button>

          <Button
            mode="filled"
            size="m"
            onClick={() => handleCalendarSubscribe("google")}
            className="w-full"
          >
            <SiGoogle className="w-4 h-4 inline mr-2" />
            Add to Google Calendar
          </Button>

          <Button
            mode="filled"
            size="m"
            onClick={() => handleCalendarSubscribe("samsung")}
            className="w-full"
          >
            <SiSamsung className="w-4 h-4 inline mr-2" />
            Add to Samsung Calendar
          </Button>
        </div>
      </div>
    </Section>
  );
}
