import type { NextFunction } from "grammy";
import type { ChatMember } from "grammy/types";
import logger from "#/config/logger";
import { BotContext } from "#/types/global";

const MEMBER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const NON_MEMBER_CACHE_TTL = 60 * 1000; // 1 minute, so newly invited friends aren't locked out for long

const INVITE_ONLY_MESSAGE = "🔒 This bot is invite only.";

const membershipCache = new Map<number, { isMember: boolean; expiresAt: number }>();

let warnedMissingGroupId = false;

export const clearMembershipCache = () => {
  membershipCache.clear();
  warnedMissingGroupId = false;
};

/**
 * Whether a getChatMember result means the user is currently in the group
 */
export const isActiveMember = (member: ChatMember) =>
  member.status === "creator" ||
  member.status === "administrator" ||
  member.status === "member" ||
  (member.status === "restricted" && member.is_member);

const isSuperAdmin = (userId: number) =>
  !!process.env.SUPER_ADMIN_ID && userId === Number(process.env.SUPER_ADMIN_ID);

/**
 * Checks (with cache) whether a user belongs to the configured group.
 * Throws if Telegram can't be reached, so callers can fail closed without caching.
 */
const isGroupMember = async (ctx: BotContext, groupId: string, userId: number) => {
  const cached = membershipCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.isMember;

  const isMember = isActiveMember(await ctx.api.getChatMember(groupId, userId));

  membershipCache.set(userId, {
    isMember,
    expiresAt: Date.now() + (isMember ? MEMBER_CACHE_TTL : NON_MEMBER_CACHE_TTL),
  });

  return isMember;
};

/**
 * Only lets members of GROUP_ID (and SUPER_ADMIN_ID) interact with the bot.
 * Must run before anything that creates users (/start, poll answers, ...).
 */
export const groupMembershipMiddleware = async (ctx: BotContext, next: NextFunction) => {
  const groupId = process.env.GROUP_ID;

  if (!groupId) {
    if (!warnedMissingGroupId) {
      warnedMissingGroupId = true;
      logger.warn("GROUP_ID not set - group membership check is DISABLED");
    }
    return next();
  }

  const userId = ctx.from?.id;

  // Fail closed: nothing we can attribute to a user gets through
  if (!userId) return;

  if (isSuperAdmin(userId)) return next();

  let allowed = false;
  try {
    allowed = await isGroupMember(ctx, groupId, userId);
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error), userId },
      "Failed to check group membership, denying access"
    );
  }

  if (allowed) return next();

  logger.info({ userId, username: ctx.from?.username }, "Blocked non-member interaction");

  // Reply when there is somewhere to reply (poll answers have no chat, so they're ignored silently)
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: INVITE_ONLY_MESSAGE, show_alert: true });
    } else if (ctx.chat?.type === "private") {
      await ctx.reply(INVITE_ONLY_MESSAGE);
    }
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error), userId },
      "Failed to send invite-only message"
    );
  }
};
