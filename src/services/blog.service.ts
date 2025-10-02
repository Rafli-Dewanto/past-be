import BlogRepository from "../repositories/blog.repository";
import BlogModel, { BlogEntity } from "../models/blog.model";
import { CreateBlogDTO, UpdateBlogDTO, UserRole } from "../models/blog.model";
import { getErrorMessage } from "../utils/error";
import { createPaginationMeta } from "../utils/pagination";
import { BlogQueryParams } from "../types/blog";
import { parseBlogQueryParamsV2 } from "../utils/blog-query-builder";

export default class BlogService {
  private blogRepository: BlogRepository;

  constructor() {
    this.blogRepository = new BlogRepository();
  }

  async createBlog(userId: number, data: CreateBlogDTO) {
    try {
      const blogEntity = BlogModel.fromCreateDTO(data, userId);
      const result = await this.blogRepository.create(
        blogEntity.toCreateInput()
      );

      if (result.error) {
        return { blog: null, error: getErrorMessage(result.error) };
      }

      const entity = BlogModel.toEntity(result.blog!);
      return { blog: entity.ToResponse(), error: null };
    } catch (error) {
      return { blog: null, error: getErrorMessage(error) };
    }
  }

  async getBlogById(id: number, userRole?: UserRole, userId?: number) {
    try {
      const result = await this.blogRepository.findById(id);

      if (result.error) {
        return { blog: null, error: getErrorMessage(result.error) };
      }

      if (!result.blog) {
        return { blog: null, error: "Blog not found" };
      }

      const entity = BlogModel.toEntity(result.blog);

      // Check if user has permission to view unpublished blog
      if (!entity.canBeViewedBy(userRole, userId)) {
        return { blog: null, error: "Blog not found" };
      }

      return { blog: entity.ToResponse(), error: null };
    } catch (error) {
      return { blog: null, error: getErrorMessage(error) };
    }
  }

  async getAllBlogs(page: number = 1, limit: number = 10, userRole?: UserRole) {
    try {
      // For regular users, only show published blogs
      // For admins and superadmins, show all blogs
      let isPublished: boolean | undefined = true;

      if (userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN) {
        isPublished = undefined; // Show all blogs
      }

      const result = await this.blogRepository.findAll(
        page,
        limit,
        isPublished
      );

      if (result.error) {
        return {
          blogs: [],
          pagination: createPaginationMeta(page, limit, 0),
          error: getErrorMessage(result.error),
        };
      }

      const entities = result.blogs!.map((blog) => BlogModel.toEntity(blog));

      return {
        blogs: entities.map((entity) => entity.ToResponse()),
        pagination: createPaginationMeta(page, limit, result.total),
        error: null,
      };
    } catch (error) {
      return {
        blogs: [],
        pagination: createPaginationMeta(page, limit, 0),
        error: getErrorMessage(error),
      };
    }
  }

  async getAllBlogsWithFilters(
    queryParams: BlogQueryParams,
    userRole?: UserRole
  ) {
    try {
      // Parse query parameters
      const query = parseBlogQueryParamsV2(queryParams);

      const result = await this.blogRepository.findWithFilters(
        query.filters,
        query.sort,
        query.search,
        query.searchFields as ("title" | "content")[],
        query.page,
        query.limit
      );

      if (result.error) {
        return {
          blogs: [],
          pagination: createPaginationMeta(query.page, query.limit, 0),
          error: getErrorMessage(result.error),
        };
      }

      const entities = result.blogs!.map((blog) => BlogModel.toEntity(blog));

      return {
        blogs: entities.map((entity) => entity.ToResponse()),
        pagination: createPaginationMeta(query.page, query.limit, result.total),
        error: null,
      };
    } catch (error) {
      return {
        blogs: [],
        pagination: createPaginationMeta(1, 10, 0),
        error: getErrorMessage(error),
      };
    }
  }

  async getUserBlogs(
    targetUserId: number,
    currentUserId: number,
    userRole: UserRole,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      // Users can only see their own blogs unless they are admin/superadmin
      const canViewAllUserBlogs =
        userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

      if (!canViewAllUserBlogs && targetUserId !== currentUserId) {
        // For other users' blogs, only show published ones
        const result = await this.blogRepository.findAll(
          page,
          limit,
          true,
          targetUserId
        );

        if (result.error) {
          return {
            blogs: [],
            pagination: createPaginationMeta(page, limit, 0),
            error: getErrorMessage(result.error),
          };
        }

        const entities = result.blogs!.map((blog) => BlogModel.toEntity(blog));
        return {
          blogs: entities.map((entity) => entity.ToResponse()),
          pagination: createPaginationMeta(page, limit, result.total),
          error: null,
        };
      }

      const result = await this.blogRepository.findByUserId(
        targetUserId,
        page,
        limit
      );

      if (result.error) {
        return {
          blogs: [],
          pagination: createPaginationMeta(page, limit, 0),
          error: getErrorMessage(result.error),
        };
      }

      const entities = result.blogs!.map((blog) => BlogModel.toEntity(blog));

      return {
        blogs: entities.map((entity) => entity.ToResponse()),
        pagination: createPaginationMeta(page, limit, result.total),
        error: null,
      };
    } catch (error) {
      return {
        blogs: [],
        pagination: createPaginationMeta(page, limit, 0),
        error: getErrorMessage(error),
      };
    }
  }

  async updateBlog(
    id: number,
    data: UpdateBlogDTO,
    userId: number,
    userRole: UserRole
  ) {
    try {
      // First check if blog exists and get current blog data
      const existingResult = await this.blogRepository.findById(id);

      if (existingResult.error || !existingResult.blog) {
        return { blog: null, error: "Blog not found" };
      }

      const existingEntity = BlogModel.toEntity(existingResult.blog);

      // Check permissions
      if (!existingEntity.canBeEditedBy(userRole, userId)) {
        return { blog: null, error: "Permission denied" };
      }

      const updatedEntity = BlogModel.fromUpdateDTO(data, existingEntity);
      const result = await this.blogRepository.update(
        id,
        updatedEntity.toUpdateInput()
      );

      if (result.error) {
        return { blog: null, error: getErrorMessage(result.error) };
      }

      const entity = BlogModel.toEntity(result.blog!);
      return { blog: entity.ToResponse(), error: null };
    } catch (error) {
      return { blog: null, error: getErrorMessage(error) };
    }
  }

  async deleteBlog(id: number, userId: number, userRole: UserRole) {
    try {
      // First check if blog exists and get current blog data
      const existingResult = await this.blogRepository.findById(id);

      if (existingResult.error || !existingResult.blog) {
        return { success: false, error: "Blog not found" };
      }

      const existingEntity = BlogModel.toEntity(existingResult.blog);

      // Check permissions
      if (!existingEntity.canBeDeletedBy(userRole, userId)) {
        return { success: false, error: "Permission denied" };
      }

      const result = await this.blogRepository.delete(id);

      if (result.error) {
        return { success: false, error: getErrorMessage(result.error) };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }
}
