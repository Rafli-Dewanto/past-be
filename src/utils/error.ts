import path from "path";

export interface FileTrace {
  file: string;
  line: number;
  column: number;
  function: string;
}

export const getErrorMessage = (error: unknown): string => {
  if (error === null || error === undefined) {
    return "An unknown error occurred";
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
};

export interface ErrorContext {
  operation?: string;
  userId?: number;
  requestId?: string;
  metadata?: any;
}

export class TrackedError extends Error {
  public fileTrace: FileTrace[];
  public context: ErrorContext;
  public timestamp: Date;
  public errorId: string;

  constructor(
    message: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message);
    this.name = "TrackedError";
    this.context = context;
    this.timestamp = new Date();
    this.errorId = `ERR-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.fileTrace = this.extractFileTrace(originalError?.stack || this.stack);

    // Preserve original stack if provided
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }

  private extractFileTrace(stack?: string): FileTrace[] {
    if (!stack) return [];

    const stackLines = stack.split("\n").slice(1); // Remove error message line
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

  public getDetailedMessage(): string {
    let message = `[${this.errorId}] ${this.message}`;

    if (this.context.operation) {
      message += ` (Operation: ${this.context.operation})`;
    }

    if (this.context.requestId) {
      message += ` (Request: ${this.context.requestId})`;
    }

    return message;
  }

  public getFileTraceString(): string {
    if (this.fileTrace.length === 0) return "No file trace available";

    let trace = "File Trace:\\n";
    this.fileTrace.forEach((item, index) => {
      const indent = "  ".repeat(index + 1);
      trace += `${indent}↳ ${item.file}:${item.line}`;
      if (item.function && item.function !== "anonymous") {
        trace += ` in ${item.function}()`;
      }
      trace += "\\n";
    });

    return trace;
  }
}

// Helper function to create and log tracked errors
export const createTrackedError = (
  message: string,
  context: ErrorContext = {},
  originalError?: Error
): TrackedError => {
  const trackedError = new TrackedError(message, context, originalError);

  // Log the error with full context to console
  console.error(`\x1b[31m🔴 ${trackedError.getDetailedMessage()}\x1b[0m`);
  console.error(`   ${trackedError.getFileTraceString()}`);
  if (originalError?.stack) {
    console.error(`   📚 Original Stack:\n${originalError.stack}`);
  }

  return trackedError;
};

// Helper function to handle async operations with error tracking
export const withErrorTracking = async <T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    throw createTrackedError(
      `Error in ${context.operation || "async operation"}`,
      context,
      error instanceof Error ? error : new Error(String(error))
    );
  }
};

// Helper function to handle sync operations with error tracking
export const withSyncErrorTracking = <T>(
  operation: () => T,
  context: ErrorContext
): T => {
  try {
    return operation();
  } catch (error) {
    throw createTrackedError(
      `Error in ${context.operation || "sync operation"}`,
      context,
      error instanceof Error ? error : new Error(String(error))
    );
  }
};
