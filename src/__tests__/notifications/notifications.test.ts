// notifications.test.ts
import cron from "node-cron";
import * as notifications from "@/notifications/notifications";
import * as helpers from "@/notifications/helpers";
import { Bot } from "grammy";

jest.mock("node-cron", () => ({
  schedule: jest.fn((_, cb) => cb()), // immediately call callback
}));

describe("startNotifications", () => {
  let bot: Bot;

  beforeEach(() => {
    bot = {} as Bot;
    jest.clearAllMocks();
  });

  it("calls all notification functions via cron", () => {
    const spyToday = jest.spyOn(helpers, "sendTodayConcerts").mockResolvedValue(undefined);
    const spyWeek = jest.spyOn(helpers, "sendWeekConcerts").mockResolvedValue(undefined);
    const spyMonth = jest.spyOn(helpers, "sendMonthConcerts").mockResolvedValue(undefined);

    notifications.startNotifications(bot);

    expect(spyToday).toHaveBeenCalledWith(bot);
    expect(spyWeek).toHaveBeenCalledWith(bot);
    expect(spyMonth).toHaveBeenCalledWith(bot);
    expect(cron.schedule).toHaveBeenCalledTimes(3);
  });
});
