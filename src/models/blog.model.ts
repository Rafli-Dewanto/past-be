import { Blog as PrismaBlog } from "@prisma/client";
import BlogRepository from "../repositories/blog.repository";
import { getErrorMessage } from "../utils/error";
import { PaginationMeta } from "../types/pagination";

export interface Blog {
  uuid: string;
  title: string;
  content: string;
  thumbnail?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  user?: {
    uuid?: string;
    name?: string;
    email?: string;
  };
}

export type CreateBlogDTO = {
  title: string;
  content: string;
  thumbnail?: string;
  isPublished?: boolean;
};

export type UpdateBlogDTO = {
  title?: string;
  content?: string;
  thumbnail?: string;
  isPublished?: boolean;
};

export interface BlogListResponse {
  blogs: Blog[];
  pagination: PaginationMeta;
}

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",
}

export class BlogEntity {
  id!: number;
  uuid!: string;
  title!: string;
  content!: string;
  thumbnail?: string;
  isPublished!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;
  userId!: number;
  user?: {
    id?: number;
    name?: string;
    email?: string;
  };

  constructor(data: Partial<BlogEntity>) {
    Object.assign(this, data);
  }

  static toEntity(prismaBlog: any): BlogEntity {
    return new BlogEntity({
      id: prismaBlog.id,
      uuid: prismaBlog.uuid,
      title: prismaBlog.title,
      content: prismaBlog.content,
      thumbnail: prismaBlog.thumbnail || undefined,
      isPublished: prismaBlog.isPublished,
      createdAt: prismaBlog.createdAt,
      updatedAt: prismaBlog.updatedAt,
      deletedAt: prismaBlog.deletedAt || undefined,
      userId: prismaBlog.userId,
      user: prismaBlog.user
        ? {
            id: prismaBlog.user.id,
            name: prismaBlog.user.name,
            email: prismaBlog.user.email,
          }
        : undefined,
    });
  }

  ToResponse(): Blog {
    return {
      uuid: this.uuid,
      title: this.title,
      content: this.content,
      thumbnail: this.thumbnail,
      isPublished: this.isPublished,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      userId: this.userId,
      user: this.user,
    };
  }

  toCreateInput(): CreateBlogDTO & { userId: number } {
    return {
      title: this.title,
      content: this.content,
      thumbnail: this.thumbnail,
      isPublished: this.isPublished,
      userId: this.userId,
    };
  }

  toUpdateInput(): UpdateBlogDTO {
    const updateData: UpdateBlogDTO = {};

    if (this.title !== undefined) updateData.title = this.title;
    if (this.content !== undefined) updateData.content = this.content;
    if (this.thumbnail !== undefined) updateData.thumbnail = this.thumbnail;
    if (this.isPublished !== undefined)
      updateData.isPublished = this.isPublished;

    return updateData;
  }

  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  canBeViewedBy(userRole?: string, userId?: number): boolean {
    if (this.isDeleted()) return false;

    if (this.isPublished) return true;

    // Unpublished blogs can only be viewed by admins, superadmins, or the author
    return (
      userRole === "ADMIN" ||
      userRole === "SUPERADMIN" ||
      this.userId === userId
    );
  }

  canBeEditedBy(userRole?: string, userId?: number): boolean {
    if (this.isDeleted()) return false;

    return (
      userRole === "SUPERADMIN" ||
      userRole === "ADMIN" ||
      this.userId === userId
    );
  }

  canBeDeletedBy(userRole?: string, userId?: number): boolean {
    return this.canBeEditedBy(userRole, userId);
  }
}

// Blog Model class for data transformation utilities
export default class BlogModel {
  static createEntity(data: Partial<BlogEntity>): BlogEntity {
    return new BlogEntity(data);
  }

  static toEntity(prismaBlog: any): BlogEntity {
    return BlogEntity.toEntity(prismaBlog);
  }

  static ToResponse(entity: BlogEntity): Blog {
    return entity.ToResponse();
  }

  static ToResponses(entities: BlogEntity[]): Blog[] {
    return entities.map((entity) => entity.ToResponse());
  }

  static fromCreateDTO(dto: CreateBlogDTO, userId: number): BlogEntity {
    return new BlogEntity({
      title: dto.title,
      content: dto.content,
      thumbnail: dto.thumbnail,
      isPublished: dto.isPublished || false,
      userId,
    });
  }

  static fromUpdateDTO(
    dto: UpdateBlogDTO,
    existingEntity: BlogEntity
  ): BlogEntity {
    const updated = new BlogEntity(existingEntity);
    Object.assign(updated, dto);
    return updated;
  }
}
