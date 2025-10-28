import { listUsersCommand } from "@/commands/users/list_users";
import { prisma } from "@/config/db";

jest.mock("@/config/db", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
  },
}));

const createCtx = () => ({
  reply: jest.fn(),
});

describe("listUsersCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reply with 'No users found.' if there are no users", async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    const ctx = createCtx();
    await listUsersCommand(ctx as any);

    expect(prisma.user.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
    expect(ctx.reply).toHaveBeenCalledWith("No users found.");
  });

  it("should list all users with their roles", async () => {
    const mockUsers = [
      { id: 1, username: "superman", role: "SuperAdmin" },
      { id: 2, username: "batman", role: "Admin" },
      { id: 3, username: null, role: null },
    ];

    (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

    const ctx = createCtx();
    await listUsersCommand(ctx as any);

    const expectedMessage =
      "👥 Users list:\n\n" +
      "• superman (ID: 1) — Role: SuperAdmin\n" +
      "• batman (ID: 2) — Role: Admin\n" +
      "• Unknown (ID: 3) — Role: User\n";

    expect(prisma.user.findMany).toHaveBeenCalledWith({ orderBy: { id: "asc" } });
    expect(ctx.reply).toHaveBeenCalledWith(expectedMessage);
  });
});
