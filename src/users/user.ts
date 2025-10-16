import { prisma } from "@/config/db";
import { User as PrismaUser } from "@prisma/client";

export type UserRole = "SuperAdmin" | "Admin" | "Moderator" | "User";

export class User {
  private user: PrismaUser;

  constructor(user: PrismaUser) {
    this.user = user;
  }

  get id() {
    return this.user.id;
  }
  get telegramId() {
    return this.user.telegramId;
  }
  get username() {
    return this.user.username;
  }
  get firstName() {
    return this.user.firstName;
  }
  get lastName() {
    return this.user.lastName;
  }
  get role() {
    return this.user.role as UserRole;
  }

  isSuperAdmin() {
    return this.role === "SuperAdmin";
  }
  isAdmin() {
    return this.role === "Admin" || this.isSuperAdmin();
  }
  isModerator() {
    return this.role === "Moderator" || this.isAdmin();
  }
  isUser() {
    return this.role === "User";
  }

  async promote(newRole: UserRole) {
    if (this.isSuperAdmin() && newRole !== "SuperAdmin") {
      throw new Error("SuperAdmin cannot demote themselves");
    }
    const updated = await prisma.user.update({
      where: { id: this.id },
      data: { role: newRole },
    });
    this.user = updated;
    return this;
  }

  async demote(newRole: UserRole) {
    return this.promote(newRole);
  }
}
