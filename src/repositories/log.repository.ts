import { PrismaClient, ApiLog, LogLevel, LogStatus } from "@prisma/client";

const prisma = new PrismaClient();

export interface LogFilters {
  level?: LogLevel;
  status?: LogStatus;
  method?: string;
  statusCode?: number;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  requestId?: string;
  search?: string; // Search in URL, error message, or file traces
}

export interface LogListResponse {
  logs: ApiLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export default class LogRepository {
  async createLog(data: {
    requestId: string;
    method: string;
    url: string;
    route?: string;
    statusCode: number;
    responseTime: number;
    userAgent?: string;
    ip: string;
    userId?: number;
    level: LogLevel;
    status: LogStatus;
    requestBody?: any;
    responseBody?: any;
    headers?: any;
    errorMessage?: string;
    stackTrace?: string;
    fileTrace?: any;
    metadata?: any;
  }) {
    try {
      const log = await prisma.apiLog.create({
        data: {
          requestId: data.requestId,
          method: data.method,
          url: data.url,
          route: data.route,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          userAgent: data.userAgent,
          ip: data.ip,
          userId: data.userId,
          level: data.level,
          status: data.status,
          requestBody: data.requestBody,
          responseBody: data.responseBody,
          headers: data.headers,
          errorMessage: data.errorMessage,
          stackTrace: data.stackTrace,
          fileTrace: data.fileTrace,
          metadata: data.metadata,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
      return { log, error: null };
    } catch (error) {
      console.error("Failed to create log entry:", error);
      return { log: null, error };
    }
  }

  async getLogById(id: number) {
    try {
      const log = await prisma.apiLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
      return { log, error: null };
    } catch (error) {
      return { log: null, error };
    }
  }

  async getLogByRequestId(requestId: string) {
    try {
      const log = await prisma.apiLog.findUnique({
        where: { requestId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
      return { log, error: null };
    } catch (error) {
      return { log: null, error };
    }
  }

  async getLogs(
    filters: LogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: ApiLog[] | null; total: number; error: any }> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = {};

      if (filters.level) {
        where.level = filters.level;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.method) {
        where.method = filters.method;
      }

      if (filters.statusCode) {
        where.statusCode = filters.statusCode;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.requestId) {
        where.requestId = filters.requestId;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      if (filters.search) {
        where.OR = [
          { url: { contains: filters.search, mode: "insensitive" } },
          { errorMessage: { contains: filters.search, mode: "insensitive" } },
          { route: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.apiLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),
        prisma.apiLog.count({ where }),
      ]);

      return { logs, total, error: null };
    } catch (error) {
      return { logs: null, total: 0, error };
    }
  }

  async getLogStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    stats: {
      totalRequests: number;
      errorCount: number;
      avgResponseTime: number;
      statusCodeBreakdown: { [key: string]: number };
      levelBreakdown: { [key: string]: number };
      topEndpoints: { url: string; count: number }[];
      topErrors: { message: string; count: number }[];
    } | null;
    error: any;
  }> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalRequests,
        errorCount,
        avgResponseTime,
        statusCodes,
        levels,
        endpoints,
        errors,
      ] = await Promise.all([
        prisma.apiLog.count({ where }),
        prisma.apiLog.count({ where: { ...where, status: LogStatus.ERROR } }),
        prisma.apiLog.aggregate({
          where,
          _avg: { responseTime: true },
        }),
        prisma.apiLog.groupBy({
          by: ["statusCode"],
          where,
          _count: { statusCode: true },
          orderBy: { _count: { statusCode: "desc" } },
        }),
        prisma.apiLog.groupBy({
          by: ["level"],
          where,
          _count: { level: true },
          orderBy: { _count: { level: "desc" } },
        }),
        prisma.apiLog.groupBy({
          by: ["url"],
          where,
          _count: { url: true },
          orderBy: { _count: { url: "desc" } },
          take: 10,
        }),
        prisma.apiLog.groupBy({
          by: ["errorMessage"],
          where: { ...where, errorMessage: { not: null } },
          _count: { errorMessage: true },
          orderBy: { _count: { errorMessage: "desc" } },
          take: 10,
        }),
      ]);

      const stats = {
        totalRequests,
        errorCount,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        statusCodeBreakdown: statusCodes.reduce((acc, item) => {
          acc[item.statusCode.toString()] = item._count.statusCode;
          return acc;
        }, {} as { [key: string]: number }),
        levelBreakdown: levels.reduce((acc, item) => {
          acc[item.level] = item._count.level;
          return acc;
        }, {} as { [key: string]: number }),
        topEndpoints: endpoints.map((item) => ({
          url: item.url,
          count: item._count.url,
        })),
        topErrors: errors
          .filter((item) => item.errorMessage)
          .map((item) => ({
            message: item.errorMessage!,
            count: item._count.errorMessage,
          })),
      };

      return { stats, error: null };
    } catch (error) {
      return { stats: null, error };
    }
  }

  async deleteOldLogs(daysToKeep: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.apiLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      return { deletedCount: result.count, error: null };
    } catch (error) {
      return { deletedCount: 0, error };
    }
  }

  async getErrorTrace(requestId: string) {
    try {
      const log = await prisma.apiLog.findUnique({
        where: { requestId },
        select: {
          id: true,
          requestId: true,
          method: true,
          url: true,
          statusCode: true,
          errorMessage: true,
          stackTrace: true,
          fileTrace: true,
          level: true,
          createdAt: true,
        },
      });

      return { trace: log, error: null };
    } catch (error) {
      return { trace: null, error };
    }
  }
}
