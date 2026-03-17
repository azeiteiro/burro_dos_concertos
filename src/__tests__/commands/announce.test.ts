import { announceCommand } from "@/commands/announce";
import { BotContext } from "@/types/global";

describe("announceCommand", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      conversation: {
        enter: jest.fn(),
      },
      from: { id: 123 },
    };
  });

  it("enters the announce conversation", async () => {
    await announceCommand(ctx as BotContext);

    expect(ctx.conversation.enter).toHaveBeenCalledWith("announceConversation");
  });
});
