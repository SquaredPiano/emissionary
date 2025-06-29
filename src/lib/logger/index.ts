/**
 * Structured Logging System
 * 
 * Implements Google's logging standards:
 * - Structured JSON logging
 * - Log levels and severity
 * - Request tracing
 * - Performance metrics
 * - Error correlation
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export enum LogSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  severity: LogSeverity;
  message: string;
  context: LogContext;
  error?: Error;
  performance?: {
    duration: number;
    memory: number;
    cpu: number;
  };
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      default: return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Human-readable format for development
      const timestamp = new Date(entry.timestamp).toISOString();
      const contextStr = Object.keys(entry.context).length > 0 
        ? ` | Context: ${JSON.stringify(entry.context)}` 
        : '';
      const errorStr = entry.error ? ` | Error: ${entry.error.stack}` : '';
      
      return `[${timestamp}] ${entry.severity}: ${entry.message}${contextStr}${errorStr}`;
    } else {
      // Structured JSON for production
      return JSON.stringify({
        ...entry,
        timestamp: entry.timestamp,
        level: LogLevel[entry.level],
        severity: entry.severity,
        error: entry.error ? {
          message: entry.error.message,
          stack: entry.error.stack,
          name: entry.error.name,
        } : undefined,
      });
    }
  }

  private log(level: LogLevel, severity: LogSeverity, message: string, context: LogContext = {}, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      severity,
      message,
      context: {
        ...context,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || 'unknown',
      },
      error,
      performance: this.getPerformanceMetrics(),
    };

    const formattedLog = this.formatLog(entry);
    
    // Output to appropriate stream
    if (level >= LogLevel.ERROR) {
      console.error(formattedLog);
    } else if (level >= LogLevel.WARN) {
      console.warn(formattedLog);
    } else {
      console.log(formattedLog);
    }

    // In production, you'd also send to external logging service
    this.sendToExternalService(entry);
  }

  private getPerformanceMetrics() {
    // Only use process.memoryUsage if available (Node.js only)
    if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
      const memUsage = process.memoryUsage();
      return {
        duration: 0, // Would be calculated from request start
        memory: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        cpu: 0, // Would be calculated from process.cpuUsage()
      };
    }
    // Fallback for browser or unsupported environments
    return {
      duration: 0,
      memory: 0,
      cpu: 0,
    };
  }

  private sendToExternalService(entry: LogEntry): void {
    // In production, send to Google Cloud Logging, DataDog, etc.
    if (!this.isDevelopment && entry.level >= LogLevel.ERROR) {
      // Example: Send critical errors to external service
      // await externalLoggingService.send(entry);
    }
  }

  public debug(message: string, context: LogContext = {}): void {
    this.log(LogLevel.DEBUG, LogSeverity.DEBUG, message, context);
  }

  public info(message: string, context: LogContext = {}): void {
    this.log(LogLevel.INFO, LogSeverity.INFO, message, context);
  }

  public warn(message: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, LogSeverity.WARNING, message, context);
  }

  public error(message: string, error?: Error, context: LogContext = {}): void {
    this.log(LogLevel.ERROR, LogSeverity.ERROR, message, context, error);
  }

  public fatal(message: string, error?: Error, context: LogContext = {}): void {
    this.log(LogLevel.FATAL, LogSeverity.CRITICAL, message, context, error);
  }

  // Request-specific logging
  public requestLog(method: string, endpoint: string, duration: number, statusCode: number, context: LogContext = {}): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const severity = statusCode >= 400 ? LogSeverity.ERROR : LogSeverity.INFO;
    
    this.log(level, severity, `${method} ${endpoint} - ${statusCode}`, {
      ...context,
      method,
      endpoint,
      duration,
      statusCode,
    });
  }

  // Performance logging
  public performance(operation: string, duration: number, context: LogContext = {}): void {
    this.log(LogLevel.INFO, LogSeverity.INFO, `Performance: ${operation}`, {
      ...context,
      operation,
      duration,
    });
  }

  // Security logging
  public security(event: string, context: LogContext = {}): void {
    this.log(LogLevel.WARN, LogSeverity.WARNING, `Security: ${event}`, {
      ...context,
      securityEvent: event,
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context),
  fatal: (message: string, error?: Error, context?: LogContext) => logger.fatal(message, error, context),
  request: (method: string, endpoint: string, duration: number, statusCode: number, context?: LogContext) => 
    logger.requestLog(method, endpoint, duration, statusCode, context),
  performance: (operation: string, duration: number, context?: LogContext) => 
    logger.performance(operation, duration, context),
  security: (event: string, context?: LogContext) => logger.security(event, context),
}; 