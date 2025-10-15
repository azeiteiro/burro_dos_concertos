import type { Conversation } from "@grammyjs/conversations";
import type { Context } from "grammy";

export const MockContext = (overrides = {}) => ({
  reply: jest.fn(),
  from: { id: 123 },
  ...overrides,
});

export const MockConversation = (
  overrides: Partial<jest.Mocked<Conversation<Context>>> = {}
): Partial<jest.Mocked<Conversation<Context>>> => ({
  wait: jest.fn(),
  waitForCallbackQuery: jest.fn().mockImplementation(() =>
    Promise.resolve({
      match: ["confirm_delete:1"],
      answerCallbackQuery: jest.fn(),
    })
  ),
  ...overrides,
});
