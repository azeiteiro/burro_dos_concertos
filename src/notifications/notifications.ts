import cron from "node-cron";
import { Bot } from "grammy";
import { sendTodayConcerts, sendWeekConcerts, sendMonthConcerts } from "./helpers";

export const startNotifications = (bot: Bot) => {
  // Daily at 8am
  cron.schedule("0 8 * * *", async () => {
    await sendTodayConcerts(bot);
  });

  // Weekly on Monday at 8am
  cron.schedule("0 8 * * 1", async () => {
    await sendWeekConcerts(bot);
  });

  // Monthly on 1st day at 8am
  cron.schedule("0 8 1 * *", async () => {
    await sendMonthConcerts(bot);
  });
};
