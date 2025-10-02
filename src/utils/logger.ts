import { v4 as uuidv4 } from "uuid";
import path from "path";
import { PrismaClient } from "@prisma/client/default";

const prisma = new PrismaClient();

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

export enum LogStatus {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  TIMEOUT = "TIMEOUT",
}

export interface FileTrace {
  file: string;
  line: number;
  column?: number;
  function?: string;
  method?: string;
}

export interface LogContext {
  requestId?: string;
  userId?: number;
  method?: string;
  url?: string;
  route?: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  requestBody?: any;
  responseBody?: any;
  headers?: any;
  metadata?: any;
}

export class Logger {
  private static instance: Logger;
  private context: LogContext = {};

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  public clearContext(): void {
    this.context = {};
  }

  private getStackTrace(): FileTrace[] {
    const stack = new Error().stack;
    if (!stack) return [];

    const stackLines = stack.split("\n").slice(2); // Remove first two lines (Error message and this function)
    const traces: FileTrace[] = [];

    for (const line of stackLines) {
      const match =
        line.match(/at\\s+(.*)\\s+\\((.*):(\\d+):(\\d+)\\)/) ||
        line.match(/at\\s+(.*):(\\d+):(\\d+)/);

      if (match) {
        const isFunction = line.includes("(");
        let functionName = "";
        let filePath = "";
        let lineNum = 0;
        let column = 0;

        if (isFunction) {
          functionName = match[1].trim();
          filePath = match[2];
          lineNum = parseInt(match[3]);
          column = parseInt(match[4]);
        } else {
          filePath = match[1];
          lineNum = parseInt(match[2]);
          column = parseInt(match[3]);
        }

        // Convert absolute path to relative for cleaner logs
        const relativePath = path.relative(process.cwd(), filePath);

        // Skip node_modules and internal Node.js files
        if (
          !relativePath.includes("node_modules") &&
          !filePath.includes("internal/")
        ) {
          traces.push({
            file: relativePath.startsWith("..") ? filePath : relativePath,
            line: lineNum,
            column,
            function: functionName || "anonymous",
          });
        }
      }
    }

    return traces;
  }

  private formatConsoleLog(
    level: LogLevel,
    message: string,
    traces: FileTrace[],
    error?: Error
  ): string {
    const timestamp = new Date().toISOString();
    const requestId = this.context.requestId || "N/A";

    let logMessage = `[${timestamp}] [${level}] [ReqID: ${requestId}] ${message}`;

    if (traces.length > 0) {
      logMessage += "\\n📂 File Trace:";
      traces.forEach((trace, index) => {
        const indent = "  ".repeat(index + 1);
        logMessage += `\\n${indent}↳ ${trace.file}:${trace.line}`;
        if (trace.function && trace.function !== "anonymous") {
          logMessage += ` in ${trace.function}()`;
        }
      });
    }

    if (error && error.stack) {
      logMessage += `\\n🔥 Error Stack:\\n${error.stack}`;
    }

    return logMessage;
  }

  private async logToDatabase(
    level: LogLevel,
    message: string,
    traces: FileTrace[],
    error?: Error,
    status: LogStatus = LogStatus.SUCCESS
  ): Promise<void> {
    try {
      await prisma.apiLog.create({
        data: {
          requestId: this.context.requestId || uuidv4(),
          method: this.context.method || "UNKNOWN",
          url: this.context.url || "",
          route: this.context.route,
          statusCode: this.context.statusCode || 0,
          responseTime: this.context.responseTime || 0,
          userAgent: this.context.userAgent,
          ip: this.context.ip || "unknown",
          userId: this.context.userId,
          level,
          status,
          requestBody: this.context.requestBody,
          responseBody: this.context.responseBody,
          headers: this.context.headers,
          errorMessage: error ? message : null,
          stackTrace: error?.stack,
          fileTrace: traces,
          metadata: this.context.metadata,
        },
      });
    } catch (dbError) {
      // Fallback to console if database logging fails
      console.error("Failed to log to database:", dbError);
    }
  }

  public debug(message: string, metadata?: any): void {
    this.setContext({ metadata });
    const traces = this.getStackTrace();
    const formattedLog = this.formatConsoleLog(LogLevel.DEBUG, message, traces);

    console.log(`\\x1b[36m${formattedLog}\\x1b[0m`); // Cyan color
    this.logToDatabase(LogLevel.DEBUG, message, traces);
  }

  public info(message: string, metadata?: any): void {
    this.setContext({ metadata });
    const traces = this.getStackTrace();
    const formattedLog = this.formatConsoleLog(LogLevel.INFO, message, traces);

    console.log(`\\x1b[32m${formattedLog}\\x1b[0m`); // Green color
    this.logToDatabase(LogLevel.INFO, message, traces);
  }

  public warn(message: string, metadata?: any): void {
    this.setContext({ metadata });
    const traces = this.getStackTrace();
    const formattedLog = this.formatConsoleLog(LogLevel.WARN, message, traces);

    console.warn(`\\x1b[33m${formattedLog}\\x1b[0m`); // Yellow color
    this.logToDatabase(
      LogLevel.WARN,
      message,
      traces,
      undefined,
      LogStatus.ERROR
    );
  }

  public error(message: string, error?: Error, metadata?: any): void {
    this.setContext({ metadata });
    const traces = this.getStackTrace();
    const formattedLog = this.formatConsoleLog(
      LogLevel.ERROR,
      message,
      traces,
      error
    );

    console.error(`\\x1b[31m${formattedLog}\\x1b[0m`); // Red color
    this.logToDatabase(LogLevel.ERROR, message, traces, error, LogStatus.ERROR);
  }

  public fatal(message: string, error?: Error, metadata?: any): void {
    this.setContext({ metadata });
    const traces = this.getStackTrace();
    const formattedLog = this.formatConsoleLog(
      LogLevel.FATAL,
      message,
      traces,
      error
    );

    console.error(`\\x1b[35m${formattedLog}\\x1b[0m`); // Magenta color
    this.logToDatabase(LogLevel.FATAL, message, traces, error, LogStatus.ERROR);
  }

  // Method to log API requests/responses
  public logApiCall(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userId?: number,
    requestBody?: any,
    responseBody?: any,
    error?: Error
  ): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const status = statusCode >= 400 ? LogStatus.ERROR : LogStatus.SUCCESS;

    this.setContext({
      method,
      url,
      statusCode,
      responseTime,
      userId,
      requestBody,
      responseBody,
    });

    const message = `${method} ${url} - ${statusCode} (${responseTime}ms)`;
    const traces = this.getStackTrace();
    const formattedLog = this.formatConsoleLog(level, message, traces, error);

    if (level === LogLevel.ERROR) {
      console.error(`\\x1b[31m${formattedLog}\\x1b[0m`);
    } else {
      console.log(`\\x1b[32m${formattedLog}\\x1b[0m`);
    }

    this.logToDatabase(level, message, traces, error, status);
  }

  // Helper method to create a child logger with specific context
  public child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Helper function to create request-scoped logger
export function createRequestLogger(requestId: string): Logger {
  const requestLogger = logger.child({ requestId });
  return requestLogger;
}
