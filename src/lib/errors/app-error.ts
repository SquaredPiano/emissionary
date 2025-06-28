/**
 * Application Error Classes
 * 
 * This implements Google's error handling standards:
 * - Structured error types
 * - Proper error codes
 * - Context preservation
 * - Stack trace management
 */

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  
  // External Services
  OCR_SERVICE_ERROR = 'OCR_SERVICE_ERROR',
  UPLOAD_SERVICE_ERROR = 'UPLOAD_SERVICE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  
  // File Operations
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  timestamp?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: any;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public context: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.context = {
      timestamp: new Date().toISOString(),
      ...context,
    };
    this.isOperational = isOperational;
    this.timestamp = this.context.timestamp!;

    // Ensure proper stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }

  public addContext(additionalContext: ErrorContext): AppError {
    this.context = { ...this.context, ...additionalContext };
    return this;
  }
}

// Specific error classes for better type safety
export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context: ErrorContext = {}) {
    super(message, ErrorCode.UNAUTHORIZED, 401, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context: ErrorContext = {}) {
    super(message, ErrorCode.FORBIDDEN, 403, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context: ErrorContext = {}) {
    super(`${resource} not found`, ErrorCode.RECORD_NOT_FOUND, 404, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.DATABASE_ERROR, 500, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context: ErrorContext = {}) {
    super(`${service} service error: ${message}`, ErrorCode.EXTERNAL_API_ERROR, 502, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context: ErrorContext = {}) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, context);
  }
}

export class FileError extends AppError {
  constructor(message: string, code: ErrorCode, context: ErrorContext = {}) {
    super(message, code, 400, context);
  }
}

// Error factory for consistent error creation
export class ErrorFactory {
  static validation(message: string, context: ErrorContext = {}): ValidationError {
    return new ValidationError(message, context);
  }

  static authentication(message?: string, context: ErrorContext = {}): AuthenticationError {
    return new AuthenticationError(message, context);
  }

  static authorization(message?: string, context: ErrorContext = {}): AuthorizationError {
    return new AuthorizationError(message, context);
  }

  static notFound(resource: string, context: ErrorContext = {}): NotFoundError {
    return new NotFoundError(resource, context);
  }

  static database(message: string, context: ErrorContext = {}): DatabaseError {
    return new DatabaseError(message, context);
  }

  static externalService(service: string, message: string, context: ErrorContext = {}): ExternalServiceError {
    return new ExternalServiceError(service, message, context);
  }

  static rateLimit(message?: string, context: ErrorContext = {}): RateLimitError {
    return new RateLimitError(message, context);
  }

  static file(message: string, code: ErrorCode, context: ErrorContext = {}): FileError {
    return new FileError(message, code, context);
  }
} 