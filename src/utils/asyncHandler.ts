import { Request, Response, NextFunction } from "express";
import { asyncErrorHandler } from "../middleware/errorTracking";

/**
 * Wrapper for async route handlers
 * Automatically catches errors and passes them to global error handler
 *
 * Usage:
 * router.get('/route', catchAsync(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json({ success: true, data });
 * }));
 */
export const catchAsync = asyncErrorHandler;

/**
 * Wrapper for controller methods
 * Use this to wrap controller methods for automatic error handling
 *
 * Usage in controller:
 * async getUser(req: Request, res: Response) {
 *   return wrapController(async () => {
 *     const user = await this.userService.getUser(req.params.id);
 *     res.json({ success: true, data: user });
 *   }, req, res);
 * }
 */
export const wrapController = async (
  fn: () => Promise<any>,
  req: Request,
  res: Response,
  next?: NextFunction
): Promise<void> => {
  try {
    await fn();
  } catch (error) {
    if (next) {
      next(error);
    } else {
      // If no next function, throw to be caught by Express error handler
      throw error;
    }
  }
};

/**
 * Creates a wrapped version of a controller class
 * All async methods are automatically wrapped with error handling
 */
export function wrapControllerClass<T extends { new (...args: any[]): {} }>(
  constructor: T
): T {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);

      // Wrap all async methods
      const prototype = Object.getPrototypeOf(this);
      Object.getOwnPropertyNames(prototype).forEach((name) => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
        if (
          descriptor &&
          typeof descriptor.value === "function" &&
          name !== "constructor"
        ) {
          const originalMethod = descriptor.value;

          // Check if method is async
          if (originalMethod.constructor.name === "AsyncFunction") {
            (this as any)[name] = async function (...methodArgs: any[]) {
              try {
                return await originalMethod.apply(this, methodArgs);
              } catch (error) {
                // If method has 3+ args, assume [req, res, next]
                if (
                  methodArgs.length >= 3 &&
                  typeof methodArgs[2] === "function"
                ) {
                  methodArgs[2](error); // Call next(error)
                } else {
                  throw error; // Re-throw to be caught by Express
                }
              }
            };
          }
        }
      });
    }
  } as T;
}

export default {
  catchAsync,
  wrapController,
  wrapControllerClass,
};
