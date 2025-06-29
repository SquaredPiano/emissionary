import { Decimal } from '@prisma/client/runtime/library';

/**
 * Check if a value is serializable (can be passed to client components)
 */
function isSerializable(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  
  if (typeof value === 'function') {
    return false;
  }
  
  if (value instanceof Date) {
    return true; // We'll convert this to ISO string
  }
  
  if (value instanceof Decimal) {
    return true; // We'll convert this to number
  }
  
  if (Array.isArray(value)) {
    return value.every(item => isSerializable(item));
  }
  
  if (typeof value === 'object') {
    // Check if it's a plain object
    if (value.constructor !== Object) {
      return false; // Class instances are not serializable
    }
    
    // Check all properties
    for (const key in value) {
      if (value.hasOwnProperty(key) && !isSerializable(value[key])) {
        return false;
      }
    }
    return true;
  }
  
  return false;
}

/**
 * Deep clone an object and convert all non-serializable parts to plain objects
 */
function deepCloneAndSerialize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle functions - these cannot be serialized
  if (typeof obj === 'function') {
    throw new Error('Functions cannot be serialized for client components');
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => deepCloneAndSerialize(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    // Handle special cases
    if (obj instanceof Decimal) {
      return obj.toNumber();
    }
    
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    // Handle class instances - convert to plain objects
    if (obj.constructor !== Object) {
      // For class instances, extract only serializable properties
      const plainObject: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          try {
            const value = obj[key];
            if (isSerializable(value)) {
              plainObject[key] = deepCloneAndSerialize(value);
            }
          } catch (error) {
            // Skip non-serializable properties
            console.warn(`Skipping non-serializable property: ${key}`);
          }
        }
      }
      return plainObject;
    }
    
    // Handle plain objects
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      try {
        if (isSerializable(value)) {
          serialized[key] = deepCloneAndSerialize(value);
        } else {
          console.warn(`Skipping non-serializable property: ${key}`);
        }
      } catch (error) {
        console.warn(`Error serializing property ${key}:`, error);
      }
    }
    
    return serialized;
  }

  // Handle other types
  return obj;
}

/**
 * Recursively serialize Prisma objects and other non-serializable data
 * This prevents "Only plain objects can be passed to Client Components" errors
 */
export function serializePrismaData<T>(data: T): T {
  try {
    return deepCloneAndSerialize(data);
  } catch (error) {
    console.error('Error serializing data:', error);
    // Return a safe fallback
    return null as T;
  }
}

/**
 * Type-safe wrapper for serializing Prisma query results
 */
export function serializePrismaResult<T>(result: T): T {
  try {
    return serializePrismaData(result);
  } catch (error) {
    console.error('Error serializing Prisma result:', error);
    // Return a safe fallback
    return null as T;
  }
}

/**
 * Serialize multiple Prisma results
 */
export function serializePrismaResults<T>(results: T[]): T[] {
  return results.map(result => serializePrismaData(result));
}

/**
 * Safe serialization that never throws - returns null for non-serializable objects
 */
export function safeSerialize<T>(data: T): T | null {
  try {
    return serializePrismaData(data);
  } catch (error) {
    console.error('Safe serialization failed:', error);
    return null;
  }
} 