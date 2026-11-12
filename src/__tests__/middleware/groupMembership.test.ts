import { groupMembershipMiddleware, clearMembershipCache } from "#/middleware/groupMembership";

jest.mock("#/config/logger");

describe("groupMembershipMiddleware", () => {
  const originalEnv = process.env;
  let next: jest.Mock;

  const makeCtx = (overrides: any = {}) =>
    ({
      from: { id: 111, username: "friend" },
      chat: { type: "private" },
      reply: jest.fn(),
      answerCallbackQuery: jest.fn(),
      api: { getChatMember: jest.fn().mockResolvedValue({ status: "member" }) },
      ...overrides,
    }) as any;

  beforeEach(() => {
    process.env = { ...originalEnv, GROUP_ID: "-100123", SUPER_ADMIN_ID: "999" };
    next = jest.fn();
    clearMembershipCache();
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each(["creator", "administrator", "member"])("allows %s", async (status) => {
    const ctx = makeCtx();
    ctx.api.getChatMember.mockResolvedValue({ status });

    await groupMembershipMiddleware(ctx, next);

    expect(ctx.api.getChatMember).toHaveBeenCalledWith("-100123", 111);
    expect(next).toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("allows restricted users that are still members", async () => {
    const ctx = makeCtx();
    ctx.api.getChatMember.mockResolvedValue({ status: "restricted", is_member: true });

    await groupMembershipMiddleware(ctx, next);

    expect(next).toHaveBeenCalled();
  });

  it.each([
    ["left", {}],
    ["kicked", {}],
    ["restricted", { is_member: false }],
  ])("blocks %s users and replies invite only", async (status, extra) => {
    const ctx = makeCtx();
    ctx.api.getChatMember.mockResolvedValue({ status, ...extra });

    await groupMembershipMiddleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("invite only"));
  });

  it("answers the callback query for non-members pressing buttons", async () => {
    const ctx = makeCtx({ callbackQuery: { id: "1" } });
    ctx.api.getChatMember.mockResolvedValue({ status: "left" });

    await groupMembershipMiddleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining("invite only") })
    );
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("silently ignores non-member poll answers (no chat to reply to)", async () => {
    const ctx = makeCtx({ chat: undefined });
    ctx.api.getChatMember.mockResolvedValue({ status: "left" });

    await groupMembershipMiddleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it("lets SUPER_ADMIN_ID through without calling Telegram", async () => {
    const ctx = makeCtx({ from: { id: 999 } });

    await groupMembershipMiddleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.api.getChatMember).not.toHaveBeenCalled();
  });

  it("fails closed when Telegram errors, and does not cache the failure", async () => {
    const ctx = makeCtx();
    ctx.api.getChatMember.mockRejectedValueOnce(new Error("telegram down"));

    await groupMembershipMiddleware(ctx, next);
    expect(next).not.toHaveBeenCalled();

    ctx.api.getChatMember.mockResolvedValueOnce({ status: "member" });
    await groupMembershipMiddleware(ctx, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("drops updates without a sender", async () => {
    const ctx = makeCtx({ from: undefined });

    await groupMembershipMiddleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(ctx.api.getChatMember).not.toHaveBeenCalled();
  });

  it("caches members to avoid calling Telegram on every update", async () => {
    const ctx = makeCtx();

    await groupMembershipMiddleware(ctx, next);
    await groupMembershipMiddleware(ctx, next);

    expect(ctx.api.getChatMember).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("re-checks non-members after the short negative cache expires", async () => {
    jest.useFakeTimers();
    const ctx = makeCtx();
    ctx.api.getChatMember.mockResolvedValueOnce({ status: "left" });

    await groupMembershipMiddleware(ctx, next);
    expect(next).not.toHaveBeenCalled();

    // Friend gets invited, then retries after the negative cache window
    ctx.api.getChatMember.mockResolvedValueOnce({ status: "member" });
    jest.advanceTimersByTime(61 * 1000);
    await groupMembershipMiddleware(ctx, next);

    expect(ctx.api.getChatMember).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("skips the check (with no Telegram call) when GROUP_ID is not configured", async () => {
    delete process.env.GROUP_ID;
    const ctx = makeCtx();

    await groupMembershipMiddleware(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(ctx.api.getChatMember).not.toHaveBeenCalled();
  });
});
