type CalendarMethod =
  | "apple"
  | "google-1"
  | "google-2"
  | "google-3"
  | "google-4"
  | "google-5"
  | "google-6"
  | "google-copy";

interface CalendarSubscriptionProps {
  onSubscribe: (method: CalendarMethod) => void;
}

export function CalendarSubscription({ onSubscribe }: CalendarSubscriptionProps) {
  return (
    <div
      className="mb-4 p-4 rounded-lg border"
      style={{
        borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
        backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📅</span>
        <h3 className="font-semibold" style={{ color: "var(--tg-theme-text-color, #000000)" }}>
          Subscribe to Calendar
        </h3>
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--tg-theme-hint-color, #999999)" }}>
        Get automatic updates for all your concerts
      </p>

      {/* Apple Calendar */}
      <button
        onClick={() => onSubscribe("apple")}
        className="w-full px-4 py-2 rounded-lg text-center text-sm font-medium mb-3"
        style={{
          backgroundColor: "var(--tg-theme-button-color, #3390ec)",
          color: "var(--tg-theme-button-text-color, #ffffff)",
        }}
      >
        📱 Apple Calendar
      </button>

      {/* Google Calendar Test Options */}
      <div className="space-y-2">
        <p
          className="text-xs font-semibold mb-2"
          style={{ color: "var(--tg-theme-hint-color, #999999)" }}
        >
          📆 Google Calendar - Test Options:
        </p>
        <button
          onClick={() => onSubscribe("google-1")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          1️⃣ webcal + www.google.com
        </button>
        <button
          onClick={() => onSubscribe("google-2")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          2️⃣ https + www.google.com
        </button>
        <button
          onClick={() => onSubscribe("google-3")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          3️⃣ webcal + calendar.google.com
        </button>
        <button
          onClick={() => onSubscribe("google-4")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          4️⃣ https + calendar.google.com
        </button>
        <button
          onClick={() => onSubscribe("google-5")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          5️⃣ Direct webcal:// URL
        </button>
        <button
          onClick={() => onSubscribe("google-6")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          6️⃣ Direct https:// URL
        </button>
        <button
          onClick={() => onSubscribe("google-copy")}
          className="w-full px-3 py-2 rounded text-left text-xs font-semibold"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #ffffff)",
          }}
        >
          📋 Copy URL (Manual)
        </button>
      </div>
    </div>
  );
}
