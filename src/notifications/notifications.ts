import cron from "node-cron";
import { Bot } from "grammy";
import { sendTodayConcerts, sendWeekConcerts, sendMonthConcerts } from "./helpers";
import pino from "pino";

const logger = pino({ name: "notifications-scheduler" });

export const startNotifications = (bot: Bot) => {
  const schedules = [
    { name: "Daily", expression: "0 8 * * *", handler: sendTodayConcerts },
    { name: "Weekly", expression: "0 8 * * 1", handler: sendWeekConcerts },
    { name: "Monthly", expression: "0 8 1 * *", handler: sendMonthConcerts },
  ];

  schedules.forEach(({ name, expression, handler }) => {
    try {
      cron.schedule(expression, async () => {
        logger.info(`Running ${name.toLowerCase()} notification job`);
        await handler(bot);
      });

      logger.info(`Scheduled ${name.toLowerCase()} notifications: ${expression}`);
    } catch (error) {
      logger.error(
        { error, name, expression },
        `Failed to schedule ${name.toLowerCase()} notifications`
      );
    }
  });

  logger.info("Notification system started successfully");
};
