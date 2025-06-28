/**
 * Request ID Generator
 * 
 * Generates unique request IDs for tracing and debugging
 */

import { randomBytes } from 'crypto';

export function generateRequestId(): string {
  // Generate a unique request ID using crypto.randomBytes
  const bytes = randomBytes(16);
  return bytes.toString('hex');
}

export function generateCorrelationId(): string {
  // Generate a correlation ID for distributed tracing
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export function extractRequestId(headers: Headers): string | undefined {
  // Extract request ID from various headers
  return (
    headers.get('x-request-id') ||
    headers.get('x-correlation-id') ||
    headers.get('x-trace-id') ||
    undefined
  );
} 