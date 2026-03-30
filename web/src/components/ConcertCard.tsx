import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { useState } from "react";
import { Badge, Button, Card, Headline, Image, Subheadline } from "@telegram-apps/telegram-ui";
import { FaCalendar, FaCheck, FaMapPin, FaStar, FaX } from "react-icons/fa6";
import React from "react";
import { useTelegram } from "@/hooks/useTelegram";

type ResponseType = "going" | "interested" | "not_going";

const VOTE_BUTTONS = [
  { type: "going" as ResponseType, icon: FaCheck, label: "Going" },
  { type: "interested" as ResponseType, icon: FaStar, label: "Interested" },
  { type: "not_going" as ResponseType, icon: FaX, label: "Not Going" },
] as const;

const RESPONSE_COLORS = {
  going: {
    bg: "bg-green-400",
    bgActive: "!bg-green-400/45",
    border: "border-green-400",
  },
  interested: {
    bg: "bg-amber-400",
    bgActive: "!bg-amber-400/45",
    border: "border-amber-400",
  },
  not_going: {
    bg: "bg-red-600",
    bgActive: "!bg-red-600/45",
    border: "border-red-600",
  },
} as const;

const STATUS_LABELS = {
  going: "Going",
  interested: "Interested",
  not_going: "Not Going",
} as const;

interface ConcertCardProps {
  concert: Concert;
  onClick?: () => void;
  onVote?: (responseType: ResponseType) => Promise<void>;
  userId?: number;
}

export function ConcertCard({ concert, onClick, onVote, userId }: ConcertCardProps) {
  const concertDate = new Date(concert.concertDate);
  const dateStr = format(concertDate, "MMM dd, yyyy");
  const timeStr = concert.concertTime ? format(new Date(concert.concertTime), "HH:mm") : null;
  const [votingFor, setVotingFor] = useState<ResponseType | null>(null);
  const { webApp } = useTelegram();

  const handleVote = async (e: React.MouseEvent, responseType: ResponseType) => {
    e.stopPropagation();
    if (!onVote || votingFor !== null) return;

    // Medium impact haptic feedback
    webApp?.HapticFeedback.impactOccurred("medium");

    setVotingFor(responseType);

    try {
      await onVote(responseType);
    } finally {
      setVotingFor(null);
    }
  };

  const getStatusBorderClass = () =>
    concert.responses?.userResponse ? RESPONSE_COLORS[concert.responses.userResponse].border : "";

  return (
    <Card
      type="plain"
      className={`mb-3 rounded-2xl w-full border relative z-0 ${getStatusBorderClass()}`}
    >
      <Image
        src={
          concert.artistImageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819"
        }
        alt={concert.artistName}
        fallbackIcon="music"
        className="w-full! h-48! object-cover rounded-t-2xl"
      />
      {concert.responses?.userResponse && (
        <Card.Chip
          className={`opacity-50 ${RESPONSE_COLORS[concert.responses.userResponse].bg}`}
          readOnly
          mode="outline"
        >
          {STATUS_LABELS[concert.responses.userResponse]}
        </Card.Chip>
      )}
      <Card.Cell
        onClick={onClick}
        className="cursor-pointer w-full"
        titleBadge={<Headline weight="1">{concert.artistName}</Headline>}
        subtitle={
          <Subheadline caps weight="1" level="2" className="text-gray-300 pt-1">
            <div className="flex items-center gap-2 mb-1 text-xs">
              <FaMapPin />
              <span>{concert.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FaCalendar />
              <span>
                {dateStr}
                {timeStr && ` at ${timeStr}`}
              </span>
            </div>
          </Subheadline>
        }
        description={concert.notes}
      ></Card.Cell>

      {concert.responses && userId && onVote && (
        <div className="mt-3 pt-3 px-3 pb-3 border-t flex gap-2">
          {VOTE_BUTTONS.map(({ type, icon: Icon, label }) => {
            const isSelected = concert.responses?.userResponse === type;
            const isLoading = votingFor === type;
            const isDisabled = votingFor !== null;

            return (
              <Button
                key={type}
                onClick={(e) => handleVote(e, type)}
                disabled={isDisabled}
                loading={isLoading}
                mode={isSelected ? "filled" : "outline"}
                className={`flex-1 ${isSelected ? RESPONSE_COLORS[type].bgActive : ""}`}
                before={<Icon />}
                stretched
                size="m"
                after={
                  <Badge mode="gray" type="number">
                    {concert.responses![type]}
                  </Badge>
                }
              >
                <span className="text-xs uppercase">{label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
