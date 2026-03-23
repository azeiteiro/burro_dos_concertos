import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { useState } from "react";
import { Button, Cell } from "@telegram-apps/telegram-ui";

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

  const getButtonMode = (
    responseType: "going" | "interested" | "not_going"
  ): "filled" | "outline" => {
    const isSelected = concert.responses?.userResponse === responseType;
    return isSelected ? "filled" : "outline";
  };

  const getStatusBorderClass = () => {
    if (!concert.responses?.userResponse) return "";

    switch (concert.responses.userResponse) {
      case "going":
        return "border-l-4 border-l-green-500 pl-3";
      case "interested":
        return "border-l-4 border-l-amber-500 pl-3";
      case "not_going":
        return "border-l-4 border-l-red-600 pl-3";
      default:
        return "";
    }
  };

  return (
    <div className={`mb-3 ${getStatusBorderClass()}`}>
      <Cell
        onClick={onClick}
        className="cursor-pointer"
        subhead={
          <>
            <div className="flex items-center gap-2 mb-1 text-sm">
              <span>📍</span>
              <span>{concert.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>📅</span>
              <span>
                {dateStr}
                {timeStr && ` at ${timeStr}`}
              </span>
            </div>
          </>
        }
        description={concert.notes}
      >
        {concert.artistName}
      </Cell>

      {concert.responses && userId && onVote && (
        <div className="mt-3 pt-3 px-4 pb-3 border-t flex gap-2">
          <Button
            onClick={(e) => handleVote(e, "going")}
            disabled={isVoting}
            mode={getButtonMode("going")}
            size="s"
            className="flex-1"
          >
            🎉 Going ({concert.responses.going})
          </Button>

          <Button
            onClick={(e) => handleVote(e, "interested")}
            disabled={isVoting}
            mode={getButtonMode("interested")}
            size="s"
            className="flex-1"
          >
            🤔 Interested ({concert.responses.interested})
          </Button>

          <Button
            onClick={(e) => handleVote(e, "not_going")}
            disabled={isVoting}
            mode={getButtonMode("not_going")}
            size="s"
            className="flex-1"
          >
            ❌ Not Going ({concert.responses.not_going})
          </Button>
        </div>
      )}
    </div>
  );
}
