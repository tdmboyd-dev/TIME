/**
 * TIME Input Validation & Sanitization
 *
 * Basic input validation utilities for security hardening.
 * No external dependencies - pure TypeScript implementation.
 *
 * TODO: Replace with Zod for more robust schema validation
 * npm install zod
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const email = input.toLowerCase().trim();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email) || email.length > 254) return null;
  return email;
}

/**
 * Validate and sanitize username
 */
export function sanitizeUsername(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const username = input.trim();
  // Allow alphanumeric, underscore, hyphen, 3-30 chars
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  if (!usernameRegex.test(username)) return null;
  return username;
}

/**
 * Validate password meets requirements
 */
export function validatePassword(password: unknown): { valid: boolean; error?: string } {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be less than 128 characters' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain a special character' };
  }
  return { valid: true };
}

/**
 * Sanitize MongoDB query to prevent NoSQL injection
 */
export function sanitizeMongoQuery(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) return {};

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    // Block MongoDB operators in keys
    if (key.startsWith('$')) continue;

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Validate positive number within range
 */
export function validateNumber(
  input: unknown,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  if (typeof num !== 'number' || isNaN(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

/**
 * Validate UUID format
 */
export function validateUUID(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(input)) return null;
  return input.toLowerCase();
}

/**
 * Validate trading symbol
 */
export function validateSymbol(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const symbol = input.toUpperCase().trim();
  // Allow letters, numbers, hyphens, underscores, forward slashes (for forex pairs)
  const symbolRegex = /^[A-Z0-9/_-]{1,20}$/;
  if (!symbolRegex.test(symbol)) return null;
  return symbol;
}

/**
 * Validate array of strings
 */
export function validateStringArray(input: unknown, maxItems: number = 100): string[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length > maxItems) return null;

  const result: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') return null;
    result.push(sanitizeString(item));
  }
  return result;
}

/**
 * Create validation error response
 */
export function validationError(field: string, message: string) {
  return {
    error: 'Validation Error',
    field,
    message,
  };
}

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizeUsername,
  validatePassword,
  sanitizeMongoQuery,
  validateNumber,
  validateUUID,
  validateSymbol,
  validateStringArray,
  validationError,
};
