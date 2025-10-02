import { Response } from "express";
import BlogService from "../services/blog.service";
import { createTrackedError } from "../utils/error";
import { AuthRequest } from "../middleware/auth";
import { CreateBlogDTO, UpdateBlogDTO, UserRole } from "../models/blog.model";
import {
  responseSuccess,
  responseCreated,
  responseError,
  responseBadRequest,
  responseUnauthorized,
  responseNotFound,
  responseForbidden,
} from "../utils/response";
import { BlogQueryParams } from "../types/blog";

export default class BlogController {
  private blogService: BlogService;

  constructor() {
    this.blogService = new BlogService();
  }

  async createBlog(req: AuthRequest, res: Response) {
    try {
      const { title, content, thumbnail, isPublished }: CreateBlogDTO =
        req.body;
      const userId = req.user?.id;

      if (!userId) {
        return responseUnauthorized(res);
      }

      if (!title || !content) {
        return responseBadRequest(res, "Title and content are required");
      }

      const result = await this.blogService.createBlog(userId, {
        title,
        content,
        thumbnail,
        isPublished,
      });

      if (result.error) {
        const trackedError = createTrackedError(
          `Failed to create blog: ${result.error}`,
          {
            operation: "blog_controller.createBlog",
            requestId: (req as any).requestId,
            userId,
            metadata: { title, content: content.substring(0, 50) },
          }
        );
        return responseError(res, result.error, 500, trackedError.errorId);
      }

      return responseCreated(res, result.blog, "Blog created successfully");
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error creating blog",
        {
          operation: "blog_controller.createBlog",
          requestId: (req as any).requestId,
          userId: req.user?.id,
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Failed to create blog",
        500,
        trackedError.errorId
      );
    }
  }

  async getAllBlogs(req: AuthRequest, res: Response) {
    try {
      const userRole = req.user?.role;

      // Extract query parameters
      const queryParams: BlogQueryParams = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        sort: req.query.sort as string,
        search: req.query.search as string,
        "search-fields": req.query["search-fields"] as string,
        title: req.query.title as string,
        content: req.query.content as string,
        thumbnail: req.query.thumbnail as string,
        "is-published": req.query["is-published"] as string,
        userId: req.query.userId as string,
        "start-date": req.query["start-date"] as string,
        "end-date": req.query["end-date"] as string,
        "date-field": req.query["date-field"] as string,
        deletedAt_null: req.query.deletedAt_null as string,
      };

      // For regular users, only show published blogs unless explicitly filtered
      const canViewAllBlogs =
        userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;
      if (!canViewAllBlogs && !queryParams["is-published"]) {
        queryParams["is-published"] = "true";
      }

      const result = await this.blogService.getAllBlogsWithFilters(
        queryParams,
        userRole
      );

      if (result.error) {
        const trackedError = createTrackedError(
          `Failed to retrieve blogs: ${result.error}`,
          {
            operation: "blog_controller.getAllBlogs",
            requestId: (req as any).requestId,
            metadata: queryParams,
          }
        );
        return responseError(res, result.error, 500, trackedError.errorId);
      }

      return res.status(200).json({
        data: result.blogs || [],
        pagination: result.pagination,
      });
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error retrieving blogs",
        {
          operation: "blog_controller.getAllBlogs",
          requestId: (req as any).requestId,
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Failed to retrieve blogs",
        500,
        trackedError.errorId
      );
    }
  }

  async getBlogById(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const userRole = req.user?.role;
      const userId = req.user?.id;

      if (isNaN(id)) {
        return responseBadRequest(res, "Invalid blog ID");
      }

      const result = await this.blogService.getBlogById(id, userRole, userId);

      if (result.error) {
        if (result.error === "Blog not found") {
          return responseNotFound(res, "Blog");
        }
        const trackedError = createTrackedError(
          `Failed to retrieve blog: ${result.error}`,
          {
            operation: "blog_controller.getBlogById",
            requestId: (req as any).requestId,
            metadata: { blogId: id },
          }
        );
        return responseError(res, result.error, 500, trackedError.errorId);
      }

      return responseSuccess(res, result.blog, "Blog retrieved successfully");
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error retrieving blog",
        {
          operation: "blog_controller.getBlogById",
          requestId: (req as any).requestId,
          metadata: { blogId: req.params.id },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Failed to retrieve blog",
        500,
        trackedError.errorId
      );
    }
  }

  async getUserBlogs(req: AuthRequest, res: Response) {
    try {
      const targetUserId = parseInt(req.params.userId);
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;

      if (!currentUserId || !userRole) {
        return responseUnauthorized(res);
      }

      if (isNaN(targetUserId)) {
        return responseBadRequest(res, "Invalid user ID");
      }

      // Extract query parameters and add userId filter
      const queryParams: BlogQueryParams = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        sort: req.query.sort as string,
        search: req.query.search as string,
        "search-fields": req.query["search-fields"] as string,
        title: req.query.title as string,
        content: req.query.content as string,
        thumbnail: req.query.thumbnail as string,
        "is-published": req.query["is-published"] as string,
        userId: targetUserId.toString(), // Force filter by target user
        "start-date": req.query["start-date"] as string,
        "end-date": req.query["end-date"] as string,
        "date-field": req.query["date-field"] as string,
        deletedAt_null: req.query.deletedAt_null as string,
      };

      // Check permissions
      const canViewAllUserBlogs =
        userRole === UserRole.ADMIN || userRole === UserRole.SUPERADMIN;

      if (!canViewAllUserBlogs && targetUserId !== currentUserId) {
        // For other users' blogs, force published filter
        queryParams["is-published"] = "true";
      }

      const result = await this.blogService.getAllBlogsWithFilters(
        queryParams,
        userRole
      );

      if (result.error) {
        const trackedError = createTrackedError(
          `Failed to retrieve user blogs: ${result.error}`,
          {
            operation: "blog_controller.getUserBlogs",
            requestId: (req as any).requestId,
            metadata: { targetUserId, ...queryParams },
          }
        );
        return responseError(res, result.error, 500, trackedError.errorId);
      }

      return res.status(200).json({
        data: result.blogs || [],
        pagination: result.pagination,
      });
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error retrieving user blogs",
        {
          operation: "blog_controller.getUserBlogs",
          requestId: (req as any).requestId,
          metadata: { userId: req.params.userId },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Failed to retrieve user blogs",
        500,
        trackedError.errorId
      );
    }
  }

  async updateBlog(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { title, content, thumbnail, isPublished }: UpdateBlogDTO =
        req.body;

      if (!userId || !userRole) {
        return responseUnauthorized(res);
      }

      if (isNaN(id)) {
        return responseBadRequest(res, "Invalid blog ID");
      }

      const updateData: UpdateBlogDTO = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
      if (isPublished !== undefined) updateData.isPublished = isPublished;

      const result = await this.blogService.updateBlog(
        id,
        updateData,
        userId,
        userRole
      );

      if (result.error) {
        if (result.error === "Blog not found") {
          return responseNotFound(res, "Blog");
        }
        if (result.error === "Permission denied") {
          return responseForbidden(
            res,
            "You don't have permission to update this blog"
          );
        }
        const trackedError = createTrackedError(
          `Failed to update blog: ${result.error}`,
          {
            operation: "blog_controller.updateBlog",
            requestId: (req as any).requestId,
            userId,
            metadata: { blogId: id, updateData },
          }
        );
        return responseError(res, result.error, 500, trackedError.errorId);
      }

      return responseSuccess(res, result.blog, "Blog updated successfully");
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error updating blog",
        {
          operation: "blog_controller.updateBlog",
          requestId: (req as any).requestId,
          userId: req.user?.id,
          metadata: { blogId: req.params.id },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Failed to update blog",
        500,
        trackedError.errorId
      );
    }
  }

  async deleteBlog(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return responseUnauthorized(res);
      }

      if (isNaN(id)) {
        return responseBadRequest(res, "Invalid blog ID");
      }

      const result = await this.blogService.deleteBlog(id, userId, userRole);

      if (result.error) {
        if (result.error === "Blog not found") {
          return responseNotFound(res, "Blog");
        }
        if (result.error === "Permission denied") {
          return responseForbidden(
            res,
            "You don't have permission to delete this blog"
          );
        }
        const trackedError = createTrackedError(
          `Failed to delete blog: ${result.error}`,
          {
            operation: "blog_controller.deleteBlog",
            requestId: (req as any).requestId,
            userId,
            metadata: { blogId: id },
          }
        );
        return responseError(res, result.error, 500, trackedError.errorId);
      }

      return responseSuccess(res, undefined, "Blog deleted successfully");
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error deleting blog",
        {
          operation: "blog_controller.deleteBlog",
          requestId: (req as any).requestId,
          userId: req.user?.id,
          metadata: { blogId: req.params.id },
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Failed to delete blog",
        500,
        trackedError.errorId
      );
    }
  }

  async getMyBlogs(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return responseUnauthorized(res);
      }

      // Extract query parameters and add userId filter
      const queryParams: BlogQueryParams = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        sort: req.query.sort as string,
        search: req.query.search as string,
        "search-fields": req.query["search-fields"] as string,
        title: req.query.title as string,
        content: req.query.content as string,
        thumbnail: req.query.thumbnail as string,
        "is-published": req.query["is-published"] as string,
        userId: userId.toString(), // Force filter by current user
        "start-date": req.query["start-date"] as string,
        "end-date": req.query["end-date"] as string,
        "date-field": req.query["date-field"] as string,
        deletedAt_null: req.query.deletedAt_null as string,
      };

      const result = await this.blogService.getAllBlogsWithFilters(
        queryParams,
        userRole
      );

      if (result.error) {
        const trackedError = createTrackedError(
          `Failed to retrieve my blogs: ${result.error}`,
          {
            operation: "blog_controller.getMyBlogs",
            requestId: (req as any).requestId,
            userId,
            metadata: queryParams,
          }
        );
        return responseError(res, result.error, 500, trackedError.errorId);
      }

      return res.status(200).json({
        data: result.blogs || [],
        pagination: result.pagination,
      });
    } catch (error) {
      const trackedError = createTrackedError(
        "Unexpected error retrieving my blogs",
        {
          operation: "blog_controller.getMyBlogs",
          requestId: (req as any).requestId,
          userId: req.user?.id,
        },
        error instanceof Error ? error : new Error(String(error))
      );
      return responseError(
        res,
        "Failed to retrieve my blogs",
        500,
        trackedError.errorId
      );
    }
  }
}
