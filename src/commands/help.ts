import { BotContext } from "@/types/global";
import { getUserByTelegramId } from "@/utils/helpers";
import { InlineKeyboard } from "grammy";

export const helpCommand = async (ctx: BotContext) => {
  if (ctx.chat?.type !== "private") {
    return ctx.reply("❌ Please use this command in a private chat.");
  }

  await showMainHelp(ctx);
};

// Shortcut command for calendar help
export const calendarCommand = async (ctx: BotContext) => {
  if (ctx.chat?.type !== "private") {
    return ctx.reply("❌ Please use this command in a private chat.");
  }

  await showCalendarHelp(ctx);
};

export const showMainHelp = async (ctx: BotContext) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  let role: string;
  try {
    const user = await getUserByTelegramId(userId);
    role = user?.role || "User";
  } catch (err) {
    console.error("Failed to get user role:", err);
    role = "User";
  }

  const isAdmin = role === "Admin" || role === "SuperAdmin";

  const keyboard = new InlineKeyboard()
    .text("🎸 Managing Concerts", "help_concerts")
    .row()
    .text("📅 Calendar Subscription", "help_calendar")
    .row()
    .text("👥 Concert Responses", "help_responses")
    .row();

  if (isAdmin) {
    keyboard.text("⚙️ Admin Commands", "help_admin").row();
  }

  keyboard.text("❓ FAQ", "help_faq");

  const message = `🤖 *Burro dos Concertos Help*

Welcome! I help you manage concert listings and keep track of who's going.

Select a topic below to learn more:`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
};

export const showConcertsHelp = async (ctx: BotContext) => {
  const keyboard = new InlineKeyboard().text("⬅️ Back to Help", "help_main");

  const message = `🎸 *Managing Concerts*

*Adding Concerts:*
There are two ways to add concerts:

1️⃣ *Share a link in private chat*
   • Send me a concert ticket link
   • I'll extract the details automatically
   • Review and confirm

2️⃣ *Use the* \`/add_concert\` *command*
   • I'll guide you step-by-step
   • Enter artist, venue, date, and notes

*Viewing Concerts:*
📱 *Mini App* (Recommended)
   • Tap the menu button (bottom-left corner)
   • Browse, search, and filter concerts
   • Mark your response (Going/Interested/Not Going)

💬 *In chat:* \`/see_concerts\`
   • See a list of upcoming concerts
   • Good for quick checks

*Editing & Deleting:*
   • \`/edit_concert\` - Edit your own concerts
   • \`/delete_concert\` - Delete your own concerts
   • Only your concerts can be modified

*Tips:*
• Concert links work best (auto-fill details)
• Add notes for parking, meetup spots, etc.
• Check the Mini App for the best experience`;

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
};

export const showCalendarHelp = async (ctx: BotContext) => {
  const keyboard = new InlineKeyboard().text("⬅️ Back to Help", "help_main");

  const message = `📅 *Calendar Subscription*

Subscribe to your personal concert calendar and see all your upcoming concerts in your phone's calendar app!

*How to Subscribe:*

1️⃣ Open the Mini App
   • Tap the menu button (next to message input)
   • It says "View Concerts" or has a ☰ icon

2️⃣ Go to "My Concerts" tab
   • This shows concerts you're attending

3️⃣ Tap your calendar app button:
   • 🍎 *Apple Calendar* - Opens directly
   • 📱 *Samsung Calendar* - Opens directly
   • 📧 *Google Calendar* - Copy link, paste in Google Calendar settings

*What's Included:*
✅ Concerts marked as "Going" or "Interested"
✅ Venue location
✅ Concert notes
✅ Link to tickets
✅ 24-hour reminder notification

*Updates Automatically:*
Your calendar refreshes every hour, so new concerts appear automatically!

*Troubleshooting:*
• Make sure you're using HTTPS (secure connection)
• For Google Calendar: You must manually add the subscription URL in settings
• Calendar shows empty? Make sure you've marked concerts as Going/Interested`;

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
};

export const showResponsesHelp = async (ctx: BotContext) => {
  const keyboard = new InlineKeyboard().text("⬅️ Back to Help", "help_main");

  const message = `👥 *Concert Responses*

Let others know if you're attending!

*Response Types:*
✅ *Going* - You're definitely attending
🤔 *Interested* - You might go
❌ *Not Going* - You can't make it

*How to Respond:*

*In the Mini App:*
   • Open any concert
   • Tap a response button at the bottom
   • Your response is saved instantly

*See Who's Going:*
   • View responses on each concert card
   • See total counts: 5 Going, 3 Interested
   • See who responded in the Mini App

*Your Calendar:*
Only concerts marked as "Going" or "Interested" appear in your calendar subscription.`;

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
};

export const showAdminHelp = async (ctx: BotContext) => {
  const keyboard = new InlineKeyboard().text("⬅️ Back to Help", "help_main");

  const message = `⚙️ *Admin Commands*

As an admin, you have access to user management:

\`/list_users\`
View all registered users with their roles

\`/promote_user\`
Promote a user to admin role
Admins can manage users and see all features

\`/demote_user\`
Demote an admin back to regular user

\`/user_info\`
Get detailed information about a specific user
Shows their Telegram ID, role, and activity

*Roles Hierarchy:*
👑 *SuperAdmin* - Full control (can't be demoted)
⚙️ *Admin* - User management + all features
👤 *User* - Standard access

*Notes:*
• Changes take effect immediately
• Users are notified of role changes
• SuperAdmin role can only be set in database`;

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
};

export const showFAQHelp = async (ctx: BotContext) => {
  const keyboard = new InlineKeyboard().text("⬅️ Back to Help", "help_main");

  const message = `❓ *Frequently Asked Questions*

*Q: Where do I see all concerts?*
A: Tap the menu button → "View Concerts" to open the Mini App. You can browse, search, and filter there.

*Q: How do I add a concert?*
A: Just send me a concert ticket link in private chat! Or use \`/add_concert\`.

*Q: Can I edit someone else's concert?*
A: No, you can only edit and delete concerts you added yourself.

*Q: Why isn't my concert showing in the calendar?*
A: Make sure you marked it as "Going" or "Interested". The calendar only includes concerts you're attending.

*Q: How often does the calendar update?*
A: Your calendar app checks for updates every hour automatically.

*Q: Can I use this bot in group chats?*
A: Most commands work only in private chats for privacy. Concert listings are meant to be shared in your group.

*Q: The Mini App won't open*
A: Make sure you're using the latest version of Telegram. Try restarting the app.

*Q: Who can see my responses?*
A: Everyone in the group can see who's going to which concert. This helps coordinate attendance!

*Still need help?*
Contact the bot admin or check the group for assistance.`;

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
};

// Callback query handler for help navigation
export const handleHelpCallbacks = async (ctx: BotContext) => {
  const data = ctx.callbackQuery?.data;

  if (!data?.startsWith("help_")) return;

  await ctx.answerCallbackQuery();

  switch (data) {
    case "help_main":
      await showMainHelp(ctx);
      break;
    case "help_concerts":
      await showConcertsHelp(ctx);
      break;
    case "help_calendar":
      await showCalendarHelp(ctx);
      break;
    case "help_responses":
      await showResponsesHelp(ctx);
      break;
    case "help_admin":
      await showAdminHelp(ctx);
      break;
    case "help_faq":
      await showFAQHelp(ctx);
      break;
  }
};
