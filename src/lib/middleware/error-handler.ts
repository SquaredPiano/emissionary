/**
 * Error Handling Middleware
 * 
 * Implements Google's error handling standards:
 * - Centralized error handling
 * - Proper error responses
 * - Security considerations
 * - Performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorFactory, ErrorCode, ErrorContext } from '@/lib/errors/app-error';
import { log } from '@/lib/logger';
import { generateRequestId } from '@/lib/utils/request-id';

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  sanitizeErrors?: boolean;
}

export interface ErrorResponse {
    success: false;
    error: {
      message: string;
      code: ErrorCode;
      requestId: string;
      timestamp: string;
      stack?: string;         // Make optional
      context?: ErrorContext; // Make optional
    };
  }

export class ErrorHandler {
  private options: ErrorHandlerOptions;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      includeStack: process.env.NODE_ENV === 'development',
      logErrors: true,
      sanitizeErrors: process.env.NODE_ENV === 'production',
      ...options,
    };
  }

  public handle(error: unknown, request: NextRequest): NextResponse {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Convert unknown errors to AppError
    const appError = this.normalizeError(error);
    
    // Add request context
    appError.addContext({
      requestId,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: this.getClientIP(request),
    });

    // Log the error
    if (this.options.logErrors) {
      log.error(
        `Request failed: ${appError.message}`,
        appError,
        {
          requestId,
          endpoint: request.nextUrl.pathname,
          method: request.method,
          statusCode: appError.statusCode,
          errorCode: appError.code,
        }
      );
    }

    // Create error response
    const response = this.createErrorResponse(appError, requestId);
    
    // Log request performance
    const duration = Date.now() - startTime;
    log.request(
      request.method,
      request.nextUrl.pathname,
      duration,
      appError.statusCode,
      { requestId }
    );

    return response;
  }

  private normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Convert generic errors to AppError
      return new AppError(
        error.message,
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        {},
        false
      );
    }

    // Handle unknown error types
    return new AppError(
      'An unexpected error occurred',
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      { originalError: String(error) },
      false
    );
  }

  private createErrorResponse(error: AppError, requestId: string): NextResponse {
    const responseBody: ErrorResponse = {
      success: false,
      error: {
        message: this.sanitizeMessage(error.message),
        code: error.code,
        requestId,
        timestamp: error.timestamp,
      },
    };
  
    // Add stack trace in development
    if (this.options.includeStack && error.stack) {
      responseBody.error.stack = error.stack;
    }
  
    // Add additional context in development
    if (this.options.includeStack && Object.keys(error.context).length > 0) {
      responseBody.error.context = error.context;
    }
  
    return NextResponse.json(responseBody, {
      status: error.statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Code': error.code,
        'Content-Type': 'application/json',
      },
    });
  }

  private sanitizeMessage(message: string): string {
    if (!this.options.sanitizeErrors) {
      return message;
    }

    // Sanitize error messages for production
    const sanitized = message
      .replace(/password|secret|key|token/gi, '[REDACTED]')
      .replace(/\/[^\/]+\/[^\/]+\.(js|ts|tsx)/g, '[FILENAME]')
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');

    return sanitized;
  }

  private getClientIP(request: NextRequest): string | undefined {
    // Get client IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return undefined;
  }

  // Convenience methods for common error scenarios
  public static handleValidationError(message: string, context?: Record<string, any>): AppError {
    return ErrorFactory.validation(message, context);
  }

  public static handleAuthenticationError(message?: string, context?: Record<string, any>): AppError {
    return ErrorFactory.authentication(message, context);
  }

  public static handleNotFoundError(resource: string, context?: Record<string, any>): AppError {
    return ErrorFactory.notFound(resource, context);
  }

  public static handleDatabaseError(message: string, context?: Record<string, any>): AppError {
    return ErrorFactory.database(message, context);
  }

  public static handleExternalServiceError(service: string, message: string, context?: Record<string, any>): AppError {
    return ErrorFactory.externalService(service, message, context);
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Convenience function for wrapping async handlers
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      // This will be handled by the middleware
      throw error;
    }
  };
}

// Error boundary for React components
export function createErrorBoundary() {
  return {
    onError: (error: Error, errorInfo: any) => {
      log.error('React Error Boundary caught error', error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      });
    },
  };
} 