import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/blog.model";
import { responseUnauthorized } from "../utils/response";

dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET as string;
const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: UserRole };
}

export const authorize = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return responseUnauthorized(res);
  }

  if (!SECRET_KEY) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
  // Authorization = Bearer <token>

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as {
      id: number;
      email: string;
    };

    // Get user data including role from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      return responseUnauthorized(res);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    next();
  } catch (error) {
    return responseUnauthorized(res);
  }
};

// Role-based authorization middleware
export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return responseUnauthorized(res);
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
};
