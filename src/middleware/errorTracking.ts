import { Request, Response, NextFunction } from "express";
import { TrackedError, createTrackedError, ErrorContext } from "../utils/error";

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Global error tracking middleware
 * Catches all errors and creates detailed traces with file locations
 */
export const globalErrorHandler = (
  error: Error | TrackedError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if error is already tracked
  const isTracked = error instanceof TrackedError;

  let trackedError: TrackedError;

  if (isTracked) {
    trackedError = error as TrackedError;
    console.error(
      `\x1b[31m🔴 [${trackedError.errorId}] Error caught by global handler\x1b[0m`
    );
  } else {
    // Create tracked error with context
    const context: ErrorContext = {
      operation: `${req.method} ${req.path}`,
      requestId: req.requestId,
      userId: (req as any).user?.id,
      metadata: {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        userAgent: req.get("User-Agent"),
        ip: req.ip || req.connection.remoteAddress,
      },
    };

    trackedError = createTrackedError(
      error.message || "An unexpected error occurred",
      context,
      error
    );
  }

  // Log detailed error information
  console.error(`\x1b[33m📍 Request: ${req.method} ${req.path}\x1b[0m`);
  console.error(`\x1b[33m🔗 Request ID: ${req.requestId || "N/A"}\x1b[0m`);

  if ((req as any).user) {
    console.error(`\x1b[33m👤 User ID: ${(req as any).user.id}\x1b[0m`);
  }

  console.error(`\x1b[31m⚠️  Error ID: ${trackedError.errorId}\x1b[0m`);
  console.error(`\x1b[31m💬 Message: ${trackedError.message}\x1b[0m`);
  console.error(`\x1b[36m📂 File Trace:\x1b[0m`);

  // Display file trace in a readable format
  trackedError.fileTrace.forEach((trace, index) => {
    const arrow = index === 0 ? "→" : "  ↳";
    console.error(
      `\x1b[36m   ${arrow} ${trace.file}:${trace.line}:${trace.column}\x1b[0m` +
        (trace.function !== "anonymous"
          ? `\x1b[90m in ${trace.function}()\x1b[0m`
          : "")
    );
  });

  // Display stack trace in development
  if (process.env.NODE_ENV === "development" && trackedError.stack) {
    console.error(`\x1b[90m📚 Stack Trace:\x1b[0m`);
    console.error(`\x1b[90m${trackedError.stack}\x1b[0m`);
  }

  // Determine status code
  const statusCode =
    (error as any).status ||
    (error as any).statusCode ||
    (error.name === "ValidationError" ? 400 : 500);

  // Prepare response
  const errorResponse: any = {
    success: false,
    error: {
      message: trackedError.message,
      errorId: trackedError.errorId,
      timestamp: trackedError.timestamp,
    },
  };

  // Add additional details in development mode
  if (process.env.NODE_ENV === "development") {
    errorResponse.error.details = {
      operation: trackedError.context.operation,
      fileTrace: trackedError.fileTrace,
      stack: trackedError.stack,
    };
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper middleware
 * Wraps async route handlers to catch rejected promises
 */
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Create tracked error with context
      const context: ErrorContext = {
        operation: `${req.method} ${req.path}`,
        requestId: req.requestId,
        userId: (req as any).user?.id,
        metadata: {
          route: req.route?.path,
          query: req.query,
          params: req.params,
        },
      };

      const trackedError = createTrackedError(
        `Async error in ${req.method} ${req.path}: ${error.message}`,
        context,
        error instanceof Error ? error : new Error(String(error))
      );

      next(trackedError);
    });
  };
};

/**
 * Request tracking middleware
 * Adds request ID and timing to all requests
 */
export const requestTracker = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique request ID if not exists
  if (!req.requestId) {
    req.requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  // Track request start time
  req.startTime = Date.now();

  // Log incoming request
  console.log(
    `\x1b[34m📥 [${new Date().toISOString()}] ${req.method} ${
      req.path
    }\x1b[0m` + `\x1b[90m (${req.requestId})\x1b[0m`
  );

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - (req.startTime || 0);
    const statusColor = res.statusCode >= 400 ? "\x1b[31m" : "\x1b[32m";

    console.log(
      `${statusColor}📤 [${new Date().toISOString()}] ${req.method} ${
        req.path
      } - ${res.statusCode}\x1b[0m` +
        `\x1b[90m (${duration}ms) (${req.requestId})\x1b[0m`
    );
  });

  next();
};

/**
 * 404 Not Found handler
 * Creates tracked error for routes that don't exist
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const context: ErrorContext = {
    operation: `${req.method} ${req.path}`,
    requestId: req.requestId,
    metadata: {
      availableRoutes: "Check API documentation",
      requestedPath: req.path,
      method: req.method,
    },
  };

  const error = createTrackedError(
    `Route not found: ${req.method} ${req.path}`,
    context
  );

  (error as any).status = 404;
  next(error);
};
