/**
 * General Utility Functions
 *
 * This module provides general-purpose utility functions that don't fit
 * into other specialized categories.
 */

// ============================================================================
// General Utilities
// ============================================================================

/**
 * Generate unique key (using timestamp and random number combination)
 * @returns Unique key string
 */
export function generateUniKey() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
