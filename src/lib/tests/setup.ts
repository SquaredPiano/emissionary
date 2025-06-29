/**
 * Test Setup and Configuration
 * 
 * Implements Google's testing standards:
 * - Proper test environment setup
 * - Mocking strategies
 * - Test utilities
 * - Performance testing
 */

import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

// Mock external services
jest.mock('@/lib/logger', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    request: jest.fn(),
    performance: jest.fn(),
    security: jest.fn(),
  },
}));

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

// Test database setup
export const testDatabase = {
  async clean() {
    // Clean all tables in test database
    const tables = ['receipt_items', 'receipts', 'users'];
    
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  },

  async seed() {
    // Seed test data
    const testUser = await prisma.user.create({
      data: {
        clerkId: 'test-clerk-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    const testReceipt = await prisma.receipt.create({
      data: {
        userId: testUser.id,
        merchant: 'Test Store',
        total: 25.99,
        date: new Date(),
        currency: 'USD',
        totalCarbonEmissions: 5.2,
      },
    });

    return { testUser, testReceipt };
  },
};

// Test utilities
export const testUtils = {
  generateMockUser() {
    return {
      id: 'test-user-id',
      clerkId: 'test-clerk-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  generateMockReceipt(userId: string) {
    return {
      id: 'test-receipt-id',
      userId,
      imageUrl: 'https://example.com/receipt.jpg',
      merchant: 'Test Store',
      total: 25.99,
      date: new Date(),
      currency: 'USD',
      totalCarbonEmissions: 5.2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  generateMockReceiptItem(receiptId: string) {
    return {
      id: 'test-item-id',
      receiptId,
      name: 'Test Product',
      quantity: 2,
      unitPrice: 12.99,
      totalPrice: 25.98,
      category: 'groceries',
      carbonEmissions: 2.6,
      confidence: 0.9,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },
};

// Performance testing utilities
export const performanceTest = {
  async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  async benchmark<T>(
    name: string,
    fn: () => Promise<T>,
    iterations: number = 100
  ): Promise<{ name: string; avgDuration: number; minDuration: number; maxDuration: number }> {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.measureTime(fn);
      durations.push(duration);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      name,
      avgDuration,
      minDuration,
      maxDuration,
    };
  },
};

// Mock request utilities
export const mockRequest = {
  create(options: Partial<Request> = {}): Request {
    return {
      method: 'GET',
      url: 'http://localhost:3000/api/test',
      headers: new Headers({
        'content-type': 'application/json',
        'user-agent': 'test-agent',
      }),
      ...options,
    } as Request;
  },

  createWithAuth(userId: string, options: Partial<Request> = {}): Request {
    return this.create({
      headers: new Headers({
        'content-type': 'application/json',
        'user-agent': 'test-agent',
        'authorization': `Bearer test-token-${userId}`,
      }),
      ...options,
    });
  },
};

// Global test setup
beforeEach(async () => {
  // Clean test database before each test
  await testDatabase.clean();
  
  // Clear all mocks
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up after each test
  await testDatabase.clean();
});

// Test environment configuration
export const testConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  },
  auth: {
    testUserId: 'test-user-id',
    testClerkId: 'test-clerk-id',
  },
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 5000,
  },
  performance: {
    maxDuration: 1000, // 1 second
    maxMemoryUsage: 50, // 50MB
  },
}; 