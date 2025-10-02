import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger, createRequestLogger, LogLevel } from "../utils/logger";

export interface LoggedRequest extends Request {
  requestId?: string;
  logger?: any;
  startTime?: number;
}

export interface LoggedResponse extends Response {
  requestId?: string;
}

// Middleware to add request ID and logger to each request
export const requestLogging = (
  req: LoggedRequest,
  res: LoggedResponse,
  next: NextFunction
) => {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  res.requestId = requestId;
  req.startTime = Date.now();

  // Create request-scoped logger
  req.logger = createRequestLogger(requestId);

  // Extract request information
  const method = req.method;
  const url = req.originalUrl || req.url;
  const userAgent = req.get("User-Agent") || "";
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const userId = (req as any).user?.id;

  // Set initial context
  req.logger.setContext({
    requestId,
    method,
    url,
    userAgent,
    ip,
    userId,
    headers: {
      "content-type": req.get("Content-Type"),
      authorization: req.get("Authorization") ? "[REDACTED]" : undefined,
      "user-agent": userAgent,
      "x-forwarded-for": req.get("X-Forwarded-For"),
    },
    requestBody: sanitizeRequestBody(req.body),
  });

  // Log incoming request
  req.logger.info(`📥 Incoming ${method} ${url}`, {
    headers: req.headers,
    query: req.query,
    params: req.params,
    body: sanitizeRequestBody(req.body),
  });

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  let responseBody: any;
  let responseSent = false;

  // Override res.json to capture response body
  res.json = function (body: any) {
    if (!responseSent) {
      responseBody = body;
      responseSent = true;
      logResponse();
    }
    return originalJson.call(this, body);
  };

  // Override res.send to capture response body
  res.send = function (body: any) {
    if (!responseSent) {
      try {
        responseBody = typeof body === "string" ? JSON.parse(body) : body;
      } catch {
        responseBody = body;
      }
      responseSent = true;
      logResponse();
    }
    return originalSend.call(this, body);
  };

  // Override res.end to capture when response ends without json/send
  res.end = function (chunk?: any, encoding?: any) {
    if (!responseSent) {
      responseBody = chunk;
      responseSent = true;
      logResponse();
    }
    return originalEnd.call(this, chunk, encoding);
  };

  function logResponse() {
    const endTime = Date.now();
    const responseTime = endTime - (req.startTime || endTime);
    const statusCode = res.statusCode;

    // Update logger context with response information
    req.logger.setContext({
      statusCode,
      responseTime,
      responseBody: sanitizeResponseBody(responseBody),
    });

    // Determine log level based on status code
    let level: LogLevel;
    let emoji: string;

    if (statusCode >= 500) {
      level = LogLevel.ERROR;
      emoji = "🔴";
    } else if (statusCode >= 400) {
      level = LogLevel.WARN;
      emoji = "🟡";
    } else if (statusCode >= 300) {
      level = LogLevel.INFO;
      emoji = "🔵";
    } else {
      level = LogLevel.INFO;
      emoji = "🟢";
    }

    // Log response
    const message = `📤 ${emoji} ${method} ${url} - ${statusCode} (${responseTime}ms)`;

    if (level === LogLevel.ERROR) {
      req.logger.error(message, undefined, {
        responseBody: sanitizeResponseBody(responseBody),
        responseTime,
        statusCode,
      });
    } else if (level === LogLevel.WARN) {
      req.logger.warn(message, {
        responseBody: sanitizeResponseBody(responseBody),
        responseTime,
        statusCode,
      });
    } else {
      req.logger.info(message, {
        responseBody: sanitizeResponseBody(responseBody),
        responseTime,
        statusCode,
      });
    }

    // Store API call in database
    req.logger.logApiCall(
      method,
      url,
      statusCode,
      responseTime,
      userId,
      sanitizeRequestBody(req.body),
      sanitizeResponseBody(responseBody)
    );
  }

  // Handle uncaught errors in the request
  const originalNextFunction = next;
  const wrappedNext = (error?: any) => {
    if (error) {
      const endTime = Date.now();
      const responseTime = endTime - (req.startTime || endTime);

      req.logger.error(`💥 Request failed: ${error.message}`, error, {
        responseTime,
        statusCode: res.statusCode || 500,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    }
    return originalNextFunction(error);
  };

  // Continue to next middleware
  wrappedNext();
};

// Middleware for handling errors with detailed logging
export const errorLogging = (
  error: Error,
  req: LoggedRequest,
  res: LoggedResponse,
  next: NextFunction
) => {
  const requestId = req.requestId || "unknown";
  const method = req.method;
  const url = req.originalUrl || req.url;
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  const endTime = Date.now();
  const responseTime = endTime - (req.startTime || endTime);

  // Use request logger if available, otherwise use global logger
  const currentLogger = req.logger || logger;

  currentLogger.setContext({
    requestId,
    method,
    url,
    statusCode,
    responseTime,
    errorMessage: error.message,
  });

  // Log the error with full context
  currentLogger.error(`💥 Unhandled error in ${method} ${url}`, error, {
    statusCode,
    responseTime,
    requestBody: sanitizeRequestBody(req.body),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  // Store error in database
  currentLogger.logApiCall(
    method,
    url,
    statusCode,
    responseTime,
    (req as any).user?.id,
    sanitizeRequestBody(req.body),
    { success: false, message: error.message },
    error
  );

  next(error);
};

// Helper function to sanitize request body (remove sensitive data)
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

// Helper function to sanitize response body (remove sensitive data)
function sanitizeResponseBody(body: any): any {
  if (!body || typeof body !== "object") return body;

  const sanitized = { ...body };
  const sensitiveFields = ["password", "token", "secret", "key"];

  // If it's a data field with token, redact it
  if (
    sanitized.data &&
    typeof sanitized.data === "string" &&
    sanitized.data.length > 50
  ) {
    // Likely a JWT token
    sanitized.data = "[JWT_TOKEN_REDACTED]";
  }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}
