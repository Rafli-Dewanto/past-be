import express from "express";
import BlogController from "../controllers/blog.controller";
import { authorize, requireRole } from "../middleware/auth";
import { UserRole } from "../models/blog.model";

const router = express.Router();
const blogController = new BlogController();

// Public routes (no authentication required)
// Note: All routes require authentication as per requirements
router.get("/", blogController.getAllBlogs.bind(blogController));

// Protected routes (require authentication)
router.post("/", authorize, blogController.createBlog.bind(blogController));
router.get("/my", authorize, blogController.getMyBlogs.bind(blogController));
router.get(
  "/user/:userId",
  authorize,
  blogController.getUserBlogs.bind(blogController)
);
router.get("/:id", authorize, blogController.getBlogById.bind(blogController));
router.put("/:id", authorize, blogController.updateBlog.bind(blogController));
router.delete(
  "/:id",
  authorize,
  blogController.deleteBlog.bind(blogController)
);

export default router;
