import { Router } from "express";
import { logController } from "../controllers/log.controller";
import { authorize, requireRole } from "../middleware/auth";
import { UserRole } from "../models/blog.model";

const router = Router();

// All log routes require authentication first
router.use(authorize);
// Then require ADMIN or SUPERADMIN access
router.use(requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]));

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the log entry
 *         requestId:
 *           type: string
 *           description: Unique request identifier
 *         method:
 *           type: string
 *           description: HTTP method
 *         url:
 *           type: string
 *           description: Request URL
 *         statusCode:
 *           type: integer
 *           description: HTTP response status code
 *         responseTime:
 *           type: integer
 *           description: Response time in milliseconds
 *         requestBody:
 *           type: object
 *           description: Request body (sanitized)
 *         responseBody:
 *           type: object
 *           description: Response body
 *         headers:
 *           type: object
 *           description: Request headers (sanitized)
 *         userAgent:
 *           type: string
 *           description: User agent string
 *         ipAddress:
 *           type: string
 *           description: Client IP address
 *         userId:
 *           type: integer
 *           nullable: true
 *           description: Associated user ID
 *         level:
 *           type: string
 *           enum: [info, warn, error, debug]
 *           description: Log level
 *         message:
 *           type: string
 *           description: Log message
 *         stackTrace:
 *           type: string
 *           nullable: true
 *           description: Error stack trace
 *         fileTrace:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *               line:
 *                 type: integer
 *               column:
 *                 type: integer
 *               function:
 *                 type: string
 *         metadata:
 *           type: object
 *           description: Additional metadata
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Log creation timestamp
 *       example:
 *         id: "123e4567-e89b-12d3-a456-426614174000"
 *         requestId: "req_abc123"
 *         method: "POST"
 *         url: "/api/auth/login"
 *         statusCode: 200
 *         responseTime: 150
 *         level: "info"
 *         message: "User login successful"
 *         createdAt: "2024-03-19T10:30:00Z"
 */

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Get API logs with pagination and filtering
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of logs per page
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warn, error, debug]
 *         description: Filter by log level
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *         description: Filter by HTTP method
 *       - in: query
 *         name: statusCode
 *         schema:
 *           type: integer
 *         description: Filter by status code
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs before this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in URL or message
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiLog'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/", logController.getLogs);

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Get log statistics and insights
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Statistics start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Statistics end date
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRequests:
 *                   type: integer
 *                 errorRate:
 *                   type: number
 *                 averageResponseTime:
 *                   type: number
 *                 statusCodeDistribution:
 *                   type: object
 *                 methodDistribution:
 *                   type: object
 *                 topErrors:
 *                   type: array
 *                   items:
 *                     type: object
 *                 performanceInsights:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get("/stats", logController.getLogStats);

/**
 * @swagger
 * /api/logs/{id}:
 *   get:
 *     summary: Get detailed log entry by ID
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Log entry ID
 *     responses:
 *       200:
 *         description: Log entry retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiLog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Log entry not found
 */
router.get("/:id", logController.getLogById);

/**
 * @swagger
 * /api/logs/trace/{requestId}:
 *   get:
 *     summary: Get complete trace for a request ID
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: Request ID to trace
 *     responses:
 *       200:
 *         description: Request trace retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestId:
 *                   type: string
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiLog'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     duration:
 *                       type: integer
 *                     success:
 *                       type: boolean
 *                     errorCount:
 *                       type: integer
 *                     fileTrace:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Request trace not found
 */
router.get("/trace/:requestId", logController.getRequestTrace);

/**
 * @swagger
 * /api/logs/cleanup:
 *   delete:
 *     summary: Clean up old logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysOld
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 30
 *         description: Delete logs older than this many days
 *     responses:
 *       200:
 *         description: Logs cleaned up successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deletedCount:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.delete("/cleanup", logController.cleanupOldLogs);

export default router;
