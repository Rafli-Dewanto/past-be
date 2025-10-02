import LogRepository, {
  LogFilters,
  LogListResponse,
} from "../repositories/log.repository";
import { getErrorMessage } from "../utils/error";
import { createBasicPagination } from "../utils/pagination";

export default class LogService {
  private logRepository: LogRepository;

  constructor() {
    this.logRepository = new LogRepository();
  }

  async getLogs(
    filters: LogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: LogListResponse | null; error: string | null }> {
    try {
      const result = await this.logRepository.getLogs(filters, page, limit);

      if (result.error) {
        return { data: null, error: getErrorMessage(result.error) };
      }

      return {
        data: {
          logs: result.logs || [],
          pagination: createBasicPagination(page, limit, result.total),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: getErrorMessage(error) };
    }
  }

  async getLogById(id: number) {
    try {
      const result = await this.logRepository.getLogById(id);

      if (result.error) {
        return { log: null, error: getErrorMessage(result.error) };
      }

      if (!result.log) {
        return { log: null, error: "Log not found" };
      }

      return { log: result.log, error: null };
    } catch (error) {
      return { log: null, error: getErrorMessage(error) };
    }
  }

  async getLogByRequestId(requestId: string) {
    try {
      const result = await this.logRepository.getLogByRequestId(requestId);

      if (result.error) {
        return { log: null, error: getErrorMessage(result.error) };
      }

      if (!result.log) {
        return { log: null, error: "Log not found" };
      }

      return { log: result.log, error: null };
    } catch (error) {
      return { log: null, error: getErrorMessage(error) };
    }
  }

  async getLogStats(startDate?: Date, endDate?: Date) {
    try {
      const result = await this.logRepository.getLogStats(startDate, endDate);

      if (result.error) {
        return { stats: null, error: getErrorMessage(result.error) };
      }

      return { stats: result.stats, error: null };
    } catch (error) {
      return { stats: null, error: getErrorMessage(error) };
    }
  }

  async getErrorTrace(requestId: string) {
    try {
      const result = await this.logRepository.getErrorTrace(requestId);

      if (result.error) {
        return { trace: null, error: getErrorMessage(result.error) };
      }

      if (!result.trace) {
        return { trace: null, error: "Error trace not found" };
      }

      return { trace: result.trace, error: null };
    } catch (error) {
      return { trace: null, error: getErrorMessage(error) };
    }
  }

  async cleanOldLogs(daysToKeep: number = 30) {
    try {
      const result = await this.logRepository.deleteOldLogs(daysToKeep);

      if (result.error) {
        return {
          success: false,
          deletedCount: 0,
          error: getErrorMessage(result.error),
        };
      }

      return {
        success: true,
        deletedCount: result.deletedCount,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        deletedCount: 0,
        error: getErrorMessage(error),
      };
    }
  }

  // Helper method to get recent errors for monitoring
  async getRecentErrors(limit: number = 20) {
    const filters: LogFilters = {
      status: "ERROR" as any, // We'll fix the enum import later
    };

    return this.getLogs(filters, 1, limit);
  }

  // Helper method to get performance insights
  async getPerformanceInsights(hours: number = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return this.getLogStats(startDate, new Date());
  }

  // Helper method to search logs by text
  async searchLogs(searchTerm: string, page: number = 1, limit: number = 50) {
    const filters: LogFilters = {
      search: searchTerm,
    };

    return this.getLogs(filters, page, limit);
  }
}
