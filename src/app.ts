import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import logger from "morgan";
import {
  requestTracker,
  notFoundHandler,
  globalErrorHandler,
} from "./middleware/errorTracking";
import authRouter from "./routes/auth.route";
import blogsRouter from "./routes/blog.route";
import { setupSwagger } from "./utils/swagger";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(requestTracker);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ origin: "*" }));

app.use("/api/auth", authRouter);
app.use("/api/blogs", blogsRouter);

setupSwagger(app);
app.use(notFoundHandler);
app.use(globalErrorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`� Swagger docs: http://localhost:${port}/api-docs`);
});

export default app;
