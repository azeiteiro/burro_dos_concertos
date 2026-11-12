/**
 * Audits DB users against the Telegram group (GROUP_ID).
 *
 * Telegram can't list group members, so this asks getChatMember for every user in the DB.
 *
 *   pnpm audit:members            # read-only report
 *   pnpm audit:members --delete   # also delete confirmed non-members that have no data
 *
 * Reads BOT_TOKEN, GROUP_ID and DATABASE_URL from the environment (or .env / .env.local).
 * The target database host is printed first so you can see whether you're pointing at prod.
 *
 * --delete only removes users that are ALL of:
 *   - confirmed outside the group (left / kicked / restricted non-member, not an API error)
 *   - role "User" (never admins or moderators)
 *   - not SUPER_ADMIN_ID
 *   - without concerts or responses
 */
import { Api, GrammyError } from "grammy";
import { prisma } from "../src/config/db";
import { isActiveMember } from "../src/middleware/groupMembership";

const DELAY_MS = 200;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Row = {
  id: number;
  telegramId: string;
  username: string;
  name: string;
  role: string;
  concerts: number;
  responses: number;
  status: string;
};

const dbHost = () => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    return "(invalid or missing DATABASE_URL)";
  }
};

async function main() {
  const shouldDelete = process.argv.includes("--delete");
  const { BOT_TOKEN, GROUP_ID, SUPER_ADMIN_ID } = process.env;

  if (!BOT_TOKEN || !GROUP_ID) {
    throw new Error("BOT_TOKEN and GROUP_ID must be set");
  }

  console.log(`Database: ${dbHost()}`);
  console.log(`Group:    ${GROUP_ID}`);
  console.log(`Mode:     ${shouldDelete ? "DELETE confirmed stray users" : "read-only"}\n`);

  const api = new Api(BOT_TOKEN);
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { concerts: true, responses: true } } },
  });

  const rows: Row[] = [];
  const deletable: number[] = [];

  for (const user of users) {
    const telegramId = Number(user.telegramId);
    let status: string;
    let confirmedNonMember = false;

    if (SUPER_ADMIN_ID && telegramId === Number(SUPER_ADMIN_ID)) {
      status = "super admin (bypass)";
    } else {
      try {
        const member = await api.getChatMember(GROUP_ID, telegramId);
        status = isActiveMember(member) ? "member" : member.status;
        confirmedNonMember = !isActiveMember(member);
      } catch (error) {
        // Never treat an API error as proof of non-membership
        status = `error: ${error instanceof GrammyError ? error.description : String(error)}`;
      }
    }

    const hasData = user._count.concerts > 0 || user._count.responses > 0;
    if (confirmedNonMember && user.role === "User" && !hasData) {
      deletable.push(user.id);
    }

    rows.push({
      id: user.id,
      telegramId: String(user.telegramId),
      username: user.username ? `@${user.username}` : "-",
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "-",
      role: user.role,
      concerts: user._count.concerts,
      responses: user._count.responses,
      status,
    });

    await delay(DELAY_MS);
  }

  console.table(rows);

  const nonMembers = rows.filter((r) => r.status !== "member" && !r.status.startsWith("super"));
  const withData = nonMembers.filter(
    (r) => !r.status.startsWith("error") && (r.concerts > 0 || r.responses > 0)
  );
  const errors = rows.filter((r) => r.status.startsWith("error"));

  console.log(`\nTotal users:            ${rows.length}`);
  console.log(`Not in group / errors:  ${nonMembers.length}`);
  console.log(`  with data (keep):     ${withData.length}`);
  console.log(`  API errors (skipped): ${errors.length}`);
  console.log(`Safe to delete:         ${deletable.length}`);

  if (!shouldDelete) {
    console.log("\nRead-only run. Re-run with --delete to remove the safe-to-delete users.");
    return;
  }

  if (deletable.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  const result = await prisma.user.deleteMany({ where: { id: { in: deletable } } });
  console.log(`\nDeleted ${result.count} users (ids: ${deletable.join(", ")}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
