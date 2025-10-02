import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SignUpDTO } from "../models/user.model";
import UserRepository from "../repositories/user.repository";
import UserModel from "../models/user.model";
import { getErrorMessage } from "../utils/error";
import { UserRole } from "../models/blog.model";

const SECRET_KEY = process.env.JWT_SECRET as string;

export default class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async signUp(user: SignUpDTO): Promise<{
    id: number | null;
    email: string | null;
    error: string | null;
  }> {
    try {
      const userEntity = UserModel.fromSignUpDTO(user);
      const hashedPassword = await bcrypt.hash(userEntity.password, 10);
      userEntity.password = hashedPassword;
      userEntity.role = user.role || UserRole.USER;

      const result = await this.userRepository.createUser(
        userEntity.toCreateInput()
      );

      if (result.error) {
        return {
          id: null,
          email: null,
          error: result.error,
        };
      }

      const createdEntity = UserModel.toEntity(result.user!);
      return {
        id: createdEntity.id,
        email: createdEntity.email,
        error: null,
      };
    } catch (error) {
      return {
        id: null,
        email: null,
        error: getErrorMessage(error),
      };
    }
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ token: string | null; error: string | null }> {
    try {
      const result = await this.userRepository.getUserByEmail(email);

      if (result.error || !result.user) {
        return { token: null, error: "Invalid Email or password" };
      }

      const userEntity = UserModel.toEntity(result.user);
      const isMatch = await bcrypt.compare(password, userEntity.password);
      if (!isMatch) return { token: null, error: "Invalid Email or password" };

      const token = jwt.sign(
        {
          email: userEntity.email,
          id: userEntity.id,
          role: userEntity.role,
        },
        SECRET_KEY,
        {
          expiresIn: 3600,
        }
      );
      return {
        token,
        error: null,
      };
    } catch (error) {
      return { token: null, error: getErrorMessage(error) };
    }
  }
}
