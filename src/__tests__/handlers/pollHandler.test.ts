// Mock dependencies before importing
jest.mock("@/utils/user");
jest.mock("@/services/pollService");

import { handlePollAnswer } from "@/handlers/pollHandler";
import { BotContext } from "@/types/global";
import * as userUtils from "@/utils/user";
import * as pollService from "@/services/pollService";

const mockedFindOrCreateUser = userUtils.findOrCreateUser as jest.MockedFunction<
  typeof userUtils.findOrCreateUser
>;
const mockedSavePollResponse = pollService.savePollResponse as jest.MockedFunction<
  typeof pollService.savePollResponse
>;

describe("pollHandler", () => {
  // Silence logs for clean output
  const originalLog = console.log;
  const originalError = console.error;

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCtx = {
      pollAnswer: {
        poll_id: "poll123",
        user: {
          id: 789,
          is_bot: false,
          first_name: "João",
          username: "joao",
        },
        option_ids: [0], // Going
      } as any,
    };
  });

  describe("handlePollAnswer", () => {
    it("should handle poll answer and save response", async () => {
      mockedFindOrCreateUser.mockResolvedValue({
        id: 10,
        telegramId: BigInt(789),
        username: "joao",
        firstName: "João",
      } as any);

      await handlePollAnswer(mockCtx as BotContext);

      expect(mockedFindOrCreateUser).toHaveBeenCalledWith({
        id: 789,
        is_bot: false,
        first_name: "João",
        username: "joao",
      });
      expect(mockedSavePollResponse).toHaveBeenCalledWith("poll123", 10, 0);
    });

    it("should handle interested option (1)", async () => {
      mockCtx.pollAnswer!.option_ids = [1];
      mockedFindOrCreateUser.mockResolvedValue({ id: 10 } as any);

      await handlePollAnswer(mockCtx as BotContext);

      expect(mockedSavePollResponse).toHaveBeenCalledWith("poll123", 10, 1);
    });

    it("should handle not going option (2)", async () => {
      mockCtx.pollAnswer!.option_ids = [2];
      mockedFindOrCreateUser.mockResolvedValue({ id: 10 } as any);

      await handlePollAnswer(mockCtx as BotContext);

      expect(mockedSavePollResponse).toHaveBeenCalledWith("poll123", 10, 2);
    });

    it("should return early if no pollAnswer", async () => {
      mockCtx.pollAnswer = undefined;

      await handlePollAnswer(mockCtx as BotContext);

      expect(mockedFindOrCreateUser).not.toHaveBeenCalled();
      expect(mockedSavePollResponse).not.toHaveBeenCalled();
    });

    it("should return early if no option selected", async () => {
      mockCtx.pollAnswer!.option_ids = [];

      await handlePollAnswer(mockCtx as BotContext);

      expect(mockedFindOrCreateUser).not.toHaveBeenCalled();
      expect(mockedSavePollResponse).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockedFindOrCreateUser.mockRejectedValue(new Error("DB error"));

      await handlePollAnswer(mockCtx as BotContext);

      // Should not throw
      expect(mockedFindOrCreateUser).toHaveBeenCalled();
    });
  });
});
