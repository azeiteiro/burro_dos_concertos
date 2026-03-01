interface CalendarSubscriptionProps {
  onSubscribe: (type: "apple" | "google-webcal" | "google-render" | "google-direct" | "google-intent") => void;
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

      {/* Google Calendar Options - For Testing */}
      <div className="space-y-2">
        <p className="text-xs font-semibold" style={{ color: "var(--tg-theme-hint-color, #999999)" }}>
          📆 Google Calendar (test which works):
        </p>
        <button
          onClick={() => onSubscribe("google-webcal")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          1️⃣ webcal:// protocol
        </button>
        <button
          onClick={() => onSubscribe("google-render")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          2️⃣ Google render URL
        </button>
        <button
          onClick={() => onSubscribe("google-direct")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          3️⃣ Direct .ics link
        </button>
        <button
          onClick={() => onSubscribe("google-intent")}
          className="w-full px-3 py-2 rounded text-left text-xs"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color, #e8e8e8)",
            color: "var(--tg-theme-text-color, #000000)",
          }}
        >
          4️⃣ Android intent URL
        </button>
      </div>
    </div>
  );
}
