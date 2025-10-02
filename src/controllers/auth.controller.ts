import { Request, Response } from "express";
import AuthService from "../services/auth.service";
import { createTrackedError } from "../utils/error";
import { generateToken, verifyToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/auth";
import {
  responseSuccess,
  responseError,
  responseBadRequest,
  responseCreated,
  responseUnauthorized,
} from "../utils/response";

export default class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async signUp(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return responseBadRequest(res, "All fields are required");
      }

      const {
        id,
        email: userEmail,
        error,
      } = await this.authService.signUp({
        email,
        name,
        password,
      });

      if (error) {
        const trackedError = createTrackedError(`Sign up failed: ${error}`, {
          operation: "auth_controller.signUp",
          requestId: (req as any).requestId,
          metadata: { email },
        });

        return responseError(res, error, 500, trackedError.errorId);
      }

      const token = generateToken(userEmail as string, id as number);

      return responseCreated(res, token, "User created successfully");
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error during sign up",
        {
          operation: "auth_controller.signUp",
          requestId: (req as any).requestId,
          metadata: { email: req.body.email },
        },
        error instanceof Error ? error : new Error(String(error))
      );

      return responseError(
        res,
        "Internal server error during registration",
        500,
        trackedError.errorId
      );
    }
  }

  async signIn(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return responseBadRequest(res, "Email and password are required");
      }

      const { token, error } = await this.authService.signIn(email, password);
      if (error) {
        const trackedError = createTrackedError(`Sign in failed: ${error}`, {
          operation: "auth_controller.signIn",
          requestId: (req as any).requestId,
          metadata: { email },
        });
        return responseError(
          res,
          typeof error === "string" ? error : "Authentication failed",
          401,
          trackedError.errorId
        );
      }

      return responseSuccess(res, token, "Login successful");
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error during sign in",
        {
          operation: "auth_controller.signIn",
          requestId: (req as any).requestId,
          metadata: { email: req.body.email },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Internal server error during authentication",
        500,
        trackedError.errorId
      );
    }
  }

  async authorize(req: AuthRequest, res: Response) {
    try {
      const token = req.headers["authorization"]?.split(" ")[1] ?? "";

      if (!token) {
        return responseUnauthorized(res, "No token provided");
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return responseUnauthorized(res, "Invalid token");
      }

      const { email, id } = decoded;
      if (!email) {
        return responseUnauthorized(res, "Invalid token payload");
      }

      const newToken = generateToken(email, id);
      return responseSuccess(res, newToken, "Token refreshed successfully");
    } catch (error) {
      const trackedError = createTrackedError(
        "Token authorization failed",
        {
          operation: "auth_controller.authorize",
          requestId: (req as any).requestId,
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Token verification failed",
        401,
        trackedError.errorId
      );
    }
  }
}
