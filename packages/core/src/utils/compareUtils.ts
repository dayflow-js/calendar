/**
 * Performs a deep comparison between two values to determine if they are equivalent.
 * Supports primitives, Date objects, and plain objects/arrays.
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  ) {
    return false;
  }

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    return false;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;

  for (const key of keysA) {
    if (!keysB.includes(key) || !isDeepEqual(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}
