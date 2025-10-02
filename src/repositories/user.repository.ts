import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { SignUpDTO } from "../models/user.model";
import { getErrorMessage } from "../utils/error";

export default class UserRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createUser(user: SignUpDTO) {
    try {
      const createdUser = await this.prisma.user.create({
        data: user,
      });
      return { user: createdUser, error: null };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return { user: null, error: "Email already exists" };
        }
      }
      console.error(
        error instanceof Error ? error.message : getErrorMessage(error)
      );
      return { user: null, error: "Error creating user" };
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email,
          deletedAt: null,
        },
      });
      return { user, error: null };
    } catch (error) {
      return { user: null, error: "Error getting user" };
    }
  }

  async getUserById(id: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id,
          deletedAt: null,
        },
      });
      return { user, error: null };
    } catch (error) {
      return { user: null, error: "Error getting user" };
    }
  }

  async updateUser(id: number, data: Partial<SignUpDTO>) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      return { user, error: null };
    } catch (error) {
      return { user: null, error: "Error updating user" };
    }
  }

  async softDeleteUser(id: number) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return { user, error: null };
    } catch (error) {
      return { user: null, error: "Error deleting user" };
    }
  }
}
