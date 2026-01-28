import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
  prefillData?: {
    artist?: string;
    venue?: string;
    date?: string;
    url?: string;
  };
}

export type BotContext = Context & ConversationFlavor & SessionFlavor<SessionData>;
