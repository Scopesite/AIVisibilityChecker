import { randomBytes } from 'crypto';

/**
 * Generate a unique ID for jobs and operations
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}
