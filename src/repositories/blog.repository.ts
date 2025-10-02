import { PrismaClient, Prisma } from "@prisma/client";
import { CreateBlogDTO, UpdateBlogDTO } from "../models/blog.model";
import { blogQueryBuilder } from "../utils/generic-query-builder";
import { FilterOption, BlogSortOptions } from "../types/blog";

// Define the blog entity type that matches the query builder configuration
type BlogEntity = {
  id: number;
  uuid: string;
  title: string;
  content: string;
  thumbnail: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  userId: number;
};

export default class BlogRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: CreateBlogDTO & { userId: number }) {
    try {
      const blog = await this.prisma.blog.create({
        data: {
          title: data.title,
          content: data.content,
          thumbnail: data.thumbnail,
          isPublished: data.isPublished || false,
          userId: data.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return { blog, error: null };
    } catch (error) {
      return { blog: null, error };
    }
  }

  async findById(id: number) {
    try {
      const blog = await this.prisma.blog.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return { blog, error: null };
    } catch (error) {
      return { blog: null, error };
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    isPublished?: boolean,
    userId?: number
  ) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {
        deletedAt: null,
      };

      if (isPublished !== undefined) {
        where.isPublished = isPublished;
      }

      if (userId) {
        where.userId = userId;
      }

      const [blogs, total] = await Promise.all([
        this.prisma.blog.findMany({
          where,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),
        this.prisma.blog.count({ where }),
      ]);

      return {
        blogs,
        total,
        error: null,
      };
    } catch (error) {
      return { blogs: null, total: 0, error };
    }
  }

  async findWithFilters(
    filters: FilterOption[] = [],
    sort: Array<{ field: keyof BlogEntity; direction: "asc" | "desc" }> = [],
    search?: string,
    searchFields: ("title" | "content")[] = ["title", "content"],
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause from filters
      const filterWhere = blogQueryBuilder.buildWhereClause(filters);

      // Build search clause
      const searchWhere = blogQueryBuilder.buildSearchClause(
        search,
        searchFields
      );

      // Combine filter and search conditions
      const where = {
        AND: [filterWhere, searchWhere].filter(
          (condition) => Object.keys(condition).length > 0
        ),
      };

      // Build orderBy clause
      const orderBy = blogQueryBuilder.buildOrderByClause(sort);

      const [blogs, total] = await Promise.all([
        this.prisma.blog.findMany({
          where,
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.blog.count({ where }),
      ]);

      return {
        blogs,
        total,
        error: null,
      };
    } catch (error) {
      return { blogs: null, total: 0, error };
    }
  }

  async findByUserId(userId: number, page: number = 1, limit: number = 10) {
    return this.findAll(page, limit, undefined, userId);
  }

  async update(id: number, data: UpdateBlogDTO) {
    try {
      const blog = await this.prisma.blog.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return { blog, error: null };
    } catch (error) {
      return { blog: null, error };
    }
  }

  async delete(id: number) {
    try {
      const blog = await this.prisma.blog.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  }
}
