import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import LogService from "../services/log.service";
import { createTrackedError } from "../utils/error";
import { logger } from "../utils/logger";
import { LogFilters } from "../repositories/log.repository";
import { LogLevel } from "@prisma/client/default";
import {
  responseSuccess,
  responseError,
  responseBadRequest,
  responseNotFound,
} from "../utils/response";

export class LogController {
  private logService: LogService;

  constructor() {
    this.logService = new LogService();
  }

  async getLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const level = req.query.level as string;
      const method = req.query.method as string;
      const statusCode = req.query["status-code"]
        ? parseInt(req.query["status-code"] as string)
        : undefined;
      const userId = req.query["user-id"]
        ? parseInt(req.query["user-id"] as string)
        : undefined;
      const startDate = req.query["start-date"]
        ? new Date(req.query["start-date"] as string)
        : undefined;
      const endDate = req.query["end-date"]
        ? new Date(req.query["end-date"] as string)
        : undefined;
      const search = req.query.search as string;

      const filters: LogFilters = {
        level: level as LogLevel,
        method,
        statusCode,
        userId,
        startDate,
        endDate,
        search,
      };

      logger.info("Fetching logs with filters", {
        filters,
        requestedBy: req.user?.id,
        requestId: (req as any).requestId,
      });

      const result = await this.logService.getLogs(filters, page, limit);

      if (result.error) {
        return responseBadRequest(res, result.error);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      const trackedError = createTrackedError(
        "Failed to fetch logs",
        {
          operation: "log_controller.getLogs",
          requestId: (req as any).requestId,
          userId: req.user?.id,
          metadata: { query: req.query },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      next(trackedError);
    }
  }

  async getLogStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const startDate = req.query["start-date"]
        ? new Date(req.query["start-date"] as string)
        : undefined;
      const endDate = req.query["end-date"]
        ? new Date(req.query["end-date"] as string)
        : undefined;

      logger.info("Fetching log statistics", {
        dateRange: { startDate, endDate },
        requestedBy: req.user?.id,
        requestId: (req as any).requestId,
      });

      const stats = await this.logService.getLogStats(startDate, endDate);

      return responseSuccess(
        res,
        stats,
        "Log statistics retrieved successfully"
      );
    } catch (error) {
      const trackedError = createTrackedError(
        "Failed to fetch log statistics",
        {
          operation: "log_controller.getLogStats",
          requestId: (req as any).requestId,
          userId: req.user?.id,
          metadata: { query: req.query },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      next(trackedError);
    }
  }

  async getLogById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      logger.info("Fetching log by ID", {
        logId: id,
        requestedBy: req.user?.id,
        requestId: (req as any).requestId,
      });

      const logId = parseInt(id);
      if (isNaN(logId)) {
        return responseBadRequest(res, "Invalid log ID format");
      }

      const result = await this.logService.getLogById(logId);

      if (result.error) {
        return responseNotFound(res, "Log");
      }

      return responseSuccess(res, result.log, "Log retrieved successfully");
    } catch (error) {
      const trackedError = createTrackedError(
        "Failed to fetch log by ID",
        {
          operation: "log_controller.getLogById",
          requestId: (req as any).requestId,
          userId: req.user?.id,
          metadata: { logId: req.params.id },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      next(trackedError);
    }
  }

  async getRequestTrace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { requestId } = req.params;

      logger.info("Fetching request trace", {
        traceRequestId: requestId,
        requestedBy: req.user?.id,
        requestId: (req as any).requestId,
      });

      const result = await this.logService.getLogByRequestId(requestId);
      const errorTrace = await this.logService.getErrorTrace(requestId);

      if (result.error) {
        return responseNotFound(res, "Request trace");
      }

      const trace = {
        requestId,
        log: result.log,
        errorTrace: errorTrace.trace || null,
        summary: {
          hasError: !!errorTrace.trace,
          errorMessage: errorTrace.error || null,
        },
      };

      return responseSuccess(
        res,
        trace,
        "Request trace retrieved successfully"
      );
    } catch (error) {
      const trackedError = createTrackedError(
        "Failed to fetch request trace",
        {
          operation: "log_controller.getRequestTrace",
          requestId: (req as any).requestId,
          userId: req.user?.id,
          metadata: { traceRequestId: req.params.requestId },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      next(trackedError);
    }
  }

  async cleanupOldLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const daysOld = parseInt(req.query["days-old"] as string) || 30;

      logger.warn("Cleaning up old logs", {
        daysOld,
        requestedBy: req.user?.id,
        requestId: (req as any).requestId,
      });

      const result = await this.logService.cleanOldLogs(daysOld);

      if (result.error) {
        return responseBadRequest(res, result.error);
      }

      const deletedCount = result.deletedCount || 0;

      logger.info("Log cleanup completed", {
        deletedCount,
        daysOld,
        requestedBy: req.user?.id,
        requestId: (req as any).requestId,
      });

      return responseSuccess(
        res,
        {
          deletedCount,
          message: `Successfully deleted ${deletedCount} log entries older than ${daysOld} days`,
        },
        "Log cleanup completed successfully"
      );
    } catch (error) {
      const trackedError = createTrackedError(
        "Failed to cleanup old logs",
        {
          operation: "log_controller.cleanupOldLogs",
          requestId: (req as any).requestId,
          userId: req.user?.id,
          metadata: { daysOld: req.query.daysOld },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      next(trackedError);
    }
  }
}

export const logController = new LogController();
