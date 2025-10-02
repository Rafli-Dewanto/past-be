import { User as PrismaUser } from "@prisma/client";

// DTOs and Types
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type SignUpDTO = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
};

export type SignInDTO = {
  email: string;
  password: string;
};

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPERADMIN = "SUPERADMIN",
}

// User Entity class
export class UserEntity {
  id!: number;
  uuid!: string;
  name!: string;
  email!: string;
  password!: string;
  role!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  constructor(data: Partial<UserEntity>) {
    Object.assign(this, data);
  }

  static toEntity(prismaUser: PrismaUser): UserEntity {
    return new UserEntity({
      id: prismaUser.id,
      uuid: prismaUser.uuid,
      name: prismaUser.name,
      email: prismaUser.email,
      password: prismaUser.password,
      role: prismaUser.role,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      deletedAt: prismaUser.deletedAt || undefined,
    });
  }

  ToResponse(): User {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role as any,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  toPublicDTO() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
    };
  }

  toCreateInput(): SignUpDTO {
    return {
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role as any,
    };
  }

  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  isActive(): boolean {
    return !this.isDeleted();
  }
}

// User Model class for data transformation utilities
export default class UserModel {
  static createEntity(data: Partial<UserEntity>): UserEntity {
    return new UserEntity(data);
  }

  static toEntity(prismaUser: PrismaUser): UserEntity {
    return UserEntity.toEntity(prismaUser);
  }

  static ToResponse(entity: UserEntity): User {
    return entity.ToResponse();
  }

  static toPublicDTO(entity: UserEntity) {
    return entity.toPublicDTO();
  }

  static fromSignUpDTO(dto: SignUpDTO): UserEntity {
    return new UserEntity({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role || "USER",
    });
  }
}
