import { Context } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

export type BotContext = Context & ConversationFlavor;
