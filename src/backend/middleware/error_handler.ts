/**
 * TIME Global Error Handler Middleware
 *
 * Catches all errors and returns safe, sanitized responses.
 * - Production: Generic error messages, no stack traces
 * - Development: Full error details for debugging
 */

import { Request, Response, NextFunction } from 'express';
import { createComponentLogger } from '../utils/logger';

const logger = createComponentLogger('ErrorHandler');

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

/**
 * Custom error class for operational errors
 */
export class OperationalError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export const Errors = {
  NotFound: (resource: string = 'Resource') =>
    new OperationalError(`${resource} not found`, 404, 'NOT_FOUND'),
  Unauthorized: (message: string = 'Authentication required') =>
    new OperationalError(message, 401, 'UNAUTHORIZED'),
  Forbidden: (message: string = 'Access denied') =>
    new OperationalError(message, 403, 'FORBIDDEN'),
  BadRequest: (message: string = 'Invalid request') =>
    new OperationalError(message, 400, 'BAD_REQUEST'),
  Conflict: (message: string = 'Resource conflict') =>
    new OperationalError(message, 409, 'CONFLICT'),
  RateLimited: (retryAfter: number) =>
    new OperationalError(`Rate limit exceeded. Retry after ${retryAfter} seconds`, 429, 'RATE_LIMITED'),
  InternalError: () =>
    new OperationalError('An unexpected error occurred', 500, 'INTERNAL_ERROR'),
};

/**
 * Async handler wrapper to catch async errors
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not Found handler (404)
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = Errors.NotFound(`Route ${req.method} ${req.path}`);
  next(error);
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Determine status code
  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error (always log full details server-side)
  const logData = {
    message: error.message,
    statusCode,
    code: error.code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
    stack: error.stack,
    isOperational: error.isOperational,
  };

  if (statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error', logData);
  }

  // Build response
  const response: Record<string, any> = {
    error: true,
    message: error.isOperational || !isProduction
      ? error.message
      : 'An unexpected error occurred. Please try again later.',
  };

  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }

  // Add details in development
  if (!isProduction) {
    response.stack = error.stack;
    response.path = req.path;
    response.method = req.method;
  }

  // Add retry-after for rate limiting
  if (statusCode === 429 && error.message.includes('Retry after')) {
    const match = error.message.match(/(\d+) seconds/);
    if (match) {
      res.setHeader('Retry-After', match[1]);
    }
  }

  res.status(statusCode).json(response);
}

/**
 * MongoDB error handler
 */
export function handleMongoError(error: any): AppError {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return Errors.Conflict(`${field} already exists`);
  }

  // Validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors || {})
      .map((e: any) => e.message)
      .join(', ');
    return Errors.BadRequest(messages || 'Validation failed');
  }

  // Cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return Errors.BadRequest(`Invalid ${error.path}: ${error.value}`);
  }

  return Errors.InternalError();
}

/**
 * JWT error handler
 */
export function handleJWTError(error: any): AppError {
  if (error.name === 'JsonWebTokenError') {
    return Errors.Unauthorized('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return Errors.Unauthorized('Token expired');
  }
  return Errors.Unauthorized('Authentication failed');
}

export default {
  OperationalError,
  Errors,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler,
  handleMongoError,
  handleJWTError,
};
