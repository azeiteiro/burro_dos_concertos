interface CalendarSubscriptionProps {
  onSubscribe: (type: "apple" | "google") => void;
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
      <div className="flex gap-2">
        <button
          onClick={() => onSubscribe("apple")}
          className="flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #ffffff)",
          }}
        >
          📱 Apple Calendar
        </button>
        <button
          onClick={() => onSubscribe("google")}
          className="flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium"
          style={{
            backgroundColor: "var(--tg-theme-button-color, #3390ec)",
            color: "var(--tg-theme-button-text-color, #ffffff)",
          }}
        >
          📆 Google Calendar
        </button>
      </div>
    </div>
  );
}
