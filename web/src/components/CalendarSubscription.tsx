import { useState } from "react";
import { SiApple, SiSamsung, SiGoogle } from "react-icons/si";
import type { WebApp } from "@twa-dev/types";
import { useCalendar } from "../hooks/useCalendar";
import { Section, Button } from "@telegram-apps/telegram-ui";

interface CalendarSubscriptionProps {
  userId: number;
  webApp: WebApp;
}

type CalendarType = "apple" | "google" | "samsung";

const CALENDAR_BUTTONS = [
  { type: "apple" as const, icon: SiApple, label: "Apple" },
  { type: "google" as const, icon: SiGoogle, label: "Google" },
  { type: "samsung" as const, icon: SiSamsung, label: "Samsung" },
];

export function CalendarSubscription({ userId, webApp }: CalendarSubscriptionProps) {
  const { handleCalendarSubscribe } = useCalendar(userId, webApp);
  const [loadingType, setLoadingType] = useState<CalendarType | null>(null);

  const handleClick = async (type: CalendarType) => {
    setLoadingType(type);
    try {
      await handleCalendarSubscribe(type);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <Section className="p-2">
      <div className="flex py-4 justify-between items-center">
        <span className="text-base font-bold">Sync Calendar</span>
        <span className="text-xs text-gray-500">Stay updated</span>
      </div>

      <div className="flex gap-2">
        {CALENDAR_BUTTONS.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            before={<Icon />}
            mode="bezeled"
            size="m"
            loading={loadingType === type}
            disabled={loadingType !== null}
            onClick={() => handleClick(type)}
            className="flex-1"
          >
            {label}
          </Button>
        ))}
      </div>
    </Section>
    // <span className="text-base font-bold">Upcoming Events</span>
  );
}
