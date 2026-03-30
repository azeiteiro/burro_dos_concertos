import { Concert } from "@/types/concert";
import { format } from "date-fns";
import { useState } from "react";
import { Badge, Button, Card, Headline, Image, Subheadline } from "@telegram-apps/telegram-ui";
import { FaCalendar, FaCheck, FaMapPin, FaStar, FaX } from "react-icons/fa6";
import { CardChip } from "@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardChip/CardChip";
import { CardCell } from "@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardCell/CardCell";
import React from "react";

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
        return "border-green-400";
      case "interested":
        return "border-amber-400";
      case "not_going":
        return "border-red-600";
      default:
        return "";
    }
  };

  const getStatusColorClass = () => {
    const response = concert.responses?.userResponse;

    if (!response) {
      return "bg-gray-300";
    }

    switch (response) {
      case "going":
        return "bg-green-400";
      case "interested":
        return "bg-amber-400";
      case "not_going":
        return "bg-red-600";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <Card type="plain" className={`mb-3 rounded-2xl w-full border ${getStatusBorderClass()}`}>
      <CardChip className={`z-10 opacity-50 ${getStatusColorClass()}`} readOnly mode="outline">
        {concert.responses?.userResponse}
      </CardChip>
      <Image
        src="https://images.unsplash.com/6/blurred_lines.jpeg"
        alt={concert.artistName}
        fallbackIcon="music"
        className="w-full! h-48! object-cover rounded-t-2xl"
      />
      <CardCell
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
                {timeStr && ` - ${timeStr}`}
              </span>
            </div>
          </Subheadline>
        }
        description={concert.notes}
      >
        {/* {concert.artistName} */}
      </CardCell>

      {concert.responses && userId && onVote && (
        <div className="mt-3 pt-3 px-3 pb-3 border-t flex gap-2">
          <Button
            onClick={(e) => handleVote(e, "going")}
            disabled={isVoting}
            loading={isVoting}
            mode={getButtonMode("going")}
            className={`flex-1 ${concert.responses?.userResponse === "going" ? "bg-green-400!" : ""}`}
            before={<FaCheck />}
            stretched
            size="m"
            after={
              <Badge mode="gray" type="number">
                {concert.responses.going}
              </Badge>
            }
          ></Button>

          <Button
            onClick={(e) => handleVote(e, "interested")}
            disabled={isVoting}
            loading={isVoting}
            mode={getButtonMode("interested")}
            className={`flex-1 ${concert.responses?.userResponse === "interested" ? "bg-amber-400!" : ""}`}
            before={<FaStar />}
            stretched
            size="m"
            after={
              <Badge mode="gray" type="number">
                {concert.responses.interested}
              </Badge>
            }
          ></Button>

          <Button
            onClick={(e) => handleVote(e, "not_going")}
            disabled={isVoting}
            loading={isVoting}
            mode={getButtonMode("not_going")}
            className={`flex-1 ${concert.responses?.userResponse === "not_going" ? "bg-red-600!" : ""}`}
            before={<FaX />}
            stretched
            size="m"
            after={
              <Badge mode="gray" type="number">
                {concert.responses.not_going}
              </Badge>
            }
          ></Button>
        </div>
      )}
    </Card>
  );
}
