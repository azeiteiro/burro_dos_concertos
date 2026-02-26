import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { useState } from "react";

interface ConcertCardProps {
  concert: Concert;
  onClick?: () => void;
  onVote?: (responseType: "going" | "interested" | "not_going") => Promise<void>;
  userId?: number;
}

export function ConcertCard({ concert, onClick, onVote, userId }: ConcertCardProps) {
  const concertDate = new Date(concert.concertDate);
  const dateStr = format(concertDate, "MMM dd, yyyy");
  const timeStr = concert.concertTime ? format(new Date(concert.concertTime), "HH:mm") : null;
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (
    e: React.MouseEvent,
    responseType: "going" | "interested" | "not_going"
  ) => {
    e.stopPropagation();
    if (!onVote || isVoting) return;

    setIsVoting(true);
    try {
      await onVote(responseType);
    } finally {
      setIsVoting(false);
    }
  };

  const getButtonClasses = (responseType: "going" | "interested" | "not_going") => {
    const isSelected = concert.responses?.userResponse === responseType;
    return `
      flex-1 px-3 py-2 rounded-lg border text-sm transition-all
      ${isVoting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
      ${isSelected ? "font-semibold" : "font-normal"}
    `.trim();
  };

  const getButtonStyle = (responseType: "going" | "interested" | "not_going") => {
    const isSelected = concert.responses?.userResponse === responseType;
    return {
      borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
      backgroundColor: isSelected ? "var(--tg-theme-button-color, #3390ec)" : "transparent",
      color: isSelected
        ? "var(--tg-theme-button-text-color, #ffffff)"
        : "var(--tg-theme-text-color, #000000)",
    };
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 mb-3 rounded-xl border ${onClick ? "cursor-pointer" : ""}`}
      style={{
        backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        borderColor: "var(--tg-theme-hint-color, #e0e0e0)",
      }}
    >
      <div className="mb-2">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--tg-theme-text-color, #000000)" }}
        >
          {concert.artistName}
        </h3>
      </div>

      <div
        className="flex items-center gap-2 mb-1 text-sm"
        style={{ color: "var(--tg-theme-hint-color, #999999)" }}
      >
        <span>📍</span>
        <span>{concert.venue}</span>
      </div>

      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--tg-theme-hint-color, #999999)" }}
      >
        <span>📅</span>
        <span>
          {dateStr}
          {timeStr && ` at ${timeStr}`}
        </span>
      </div>

      {concert.notes && (
        <div className="mt-2 text-xs" style={{ color: "var(--tg-theme-hint-color, #999999)" }}>
          {concert.notes}
        </div>
      )}

      {concert.responses && userId && onVote && (
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: "var(--tg-theme-hint-color, #e0e0e0)" }}
        >
          <div className="flex gap-2">
            <button
              onClick={(e) => handleVote(e, "going")}
              disabled={isVoting}
              className={getButtonClasses("going")}
              style={getButtonStyle("going")}
            >
              🎉 Going ({concert.responses.going})
            </button>

            <button
              onClick={(e) => handleVote(e, "interested")}
              disabled={isVoting}
              className={getButtonClasses("interested")}
              style={getButtonStyle("interested")}
            >
              🤔 Interested ({concert.responses.interested})
            </button>

            <button
              onClick={(e) => handleVote(e, "not_going")}
              disabled={isVoting}
              className={getButtonClasses("not_going")}
              style={getButtonStyle("not_going")}
            >
              ❌ Not Going ({concert.responses.not_going})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
