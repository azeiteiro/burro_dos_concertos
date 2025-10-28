import { userInfoCommand } from "@/commands/users/user_info";
import { prisma } from "@/config/db";

jest.mock("@/config/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const createCtx = (text?: string) => ({
  message: text ? { text } : undefined,
  reply: jest.fn(),
});

describe("userInfoCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reply with usage if no ID provided", async () => {
    const ctx = createCtx("/user_info");
    await userInfoCommand(ctx as any);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Usage: /user_info <userId>");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("should reply 'User not found' if the user does not exist", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const ctx = createCtx("/user_info 42");
    await userInfoCommand(ctx as any);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
    expect(ctx.reply).toHaveBeenCalledWith("❌ User not found.");
  });

  it("should reply with full user info when user exists", async () => {
    const mockUser = {
      id: 7,
      username: "john_doe",
      firstName: "John",
      lastName: "Doe",
      languageCode: "en",
      role: "Admin",
      createdAt: new Date("2025-10-27T12:00:00.000Z"),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const ctx = createCtx("/user_info 7");
    await userInfoCommand(ctx as any);

    const expectedMessage = `
👤 User info
ID: 7
Username: john_doe
Name: John Doe
Language: en
Role: Admin
Created: 2025-10-27T12:00:00.000Z
`;

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(ctx.reply).toHaveBeenCalledWith(expectedMessage);
  });

  it("should handle missing optional fields gracefully", async () => {
    const mockUser = {
      id: 8,
      username: null,
      firstName: null,
      lastName: null,
      languageCode: null,
      role: null,
      createdAt: new Date("2025-10-27T12:00:00.000Z"),
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const ctx = createCtx("/user_info 8");
    await userInfoCommand(ctx as any);

    const expectedMessage = `
👤 User info
ID: 8
Username: -
Name:  
Language: -
Role: User
Created: 2025-10-27T12:00:00.000Z
`;

    expect(ctx.reply).toHaveBeenCalledWith(expectedMessage);
  });
});
